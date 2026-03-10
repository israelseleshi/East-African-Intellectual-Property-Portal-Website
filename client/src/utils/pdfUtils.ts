import { PDFDocument, StandardFonts, PDFFont, PDFTextField, PDFCheckBox, PDFObject, PDFName, PDFArray, PDFDict, PDFHexString, PDFString } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import countries from 'world-countries'

// Pre-process countries for flag logic
const countryList = countries.map((c: any) => ({
  name: c.name.common,
  value: c.name.common,
  code: c.cca2,
}));

export async function getPdfFields(pdfUrl: string) {
  try {
    const response = await fetch(pdfUrl)
    const arrayBuffer = await response.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    pdfDoc.registerFontkit(fontkit)
    const form = pdfDoc.getForm()
    const fields = form.getFields()

    return fields.map(f => ({
      name: f.getName(),
      type: f.constructor.name
    }))
  } catch (_e) {
    console.error('Error getting PDF fields:', _e)
    throw _e
  }
}

export async function fillPdfForm(pdfUrl: string, data: Record<string, unknown>, shouldFlatten = false) {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    pdfDoc.registerFontkit(fontkit);
    // Load Amharic font (prefer Ebrima, fallback to Abyssinica SIL)
    // Load Amharic font (Check user specified fonts)
    let amharicFont: PDFFont | null = null;
    try {
      const fontUrls = [
        window.location.origin + '/fonts/AbyssinicaSIL-Regular.ttf',
        window.location.origin + '/fonts/ebrima.ttf',
        window.location.origin + '/fonts/ebrima-bold.ttf',
        '/fonts/AbyssinicaSIL-Regular.ttf',
        '/fonts/ebrima.ttf',
      ];
      for (const fontUrl of fontUrls) {
        try {
          const fontRes = await fetch(fontUrl);
          if (fontRes.ok) {
            const fontBytes = await fontRes.arrayBuffer();
            amharicFont = await pdfDoc.embedFont(fontBytes);
            break;
          }
        } catch { /* try next font */ }
      }
    } catch (_e) {
      console.warn('Failed to load local Amharic font...', _e);
    }

    if (amharicFont) {
      // REGISTER the font in the form's default resources so it can be used by name in DA strings
      const formForFontReg = pdfDoc.getForm();
      try {
        const dr = formForFontReg.acroForm.dict.get(PDFName.of('DR')) as PDFDict;
        if (dr) {
          let fontRes = dr.get(PDFName.of('Font')) as PDFDict;
          if (!fontRes) {
            fontRes = pdfDoc.context.obj({}) as unknown as PDFDict;
            dr.set(PDFName.of('Font'), fontRes as unknown as PDFObject);
          }
          (fontRes as any).set(PDFName.of(amharicFont.name), amharicFont.ref);
        }
      } catch (regErr) {
        console.warn('Could not register Amharic font in DR:', regErr);
      }
    }

    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const form = pdfDoc.getForm();

    // CRITICAL: Tell the PDF spec we are handling appearances ourselves.
    // This prevents pdf-lib (and viewers) from auto-regenerating field appearances
    // using the default Helvetica/WinAnsi font, which crashes on Amharic.
    try {
      form.acroForm.dict.set(PDFName.of('NeedAppearances'), pdfDoc.context.obj(false));
    } catch (_e) { /* ignore */ }

    const allFields = form.getFields();

    // ─── EARLY REPAIR SWEEP ──────────────────────────────────────────────────
    // Some fields (notably the second `renewal_fax` used for P.O.Box) are malformed:
    // they have no Rect and no /DA. We patch both before doing anything else.
    allFields.forEach(field => {
      try {
        const acroField = (field as any).acroField;
        const fieldDA = acroField.dict.get(PDFName.of('DA'));
        if (!fieldDA) {
          // Inject a safe Helv (Helvetica) DA at the field level
          acroField.dict.set(PDFName.of('DA'), pdfDoc.context.obj('/Helv 10 Tf 0 g'));
        }
        acroField.getWidgets().forEach((widget: any) => {
          try {
            const rect = widget.dict.get(PDFName.of('Rect'));
            if (!rect || !(rect instanceof PDFArray)) {
              widget.dict.set(PDFName.of('Rect'), pdfDoc.context.obj([0, 0, 0, 0]));
            }
          } catch { /* ignore */ }
        });
      } catch { /* ignore */ }
    });

    const availableFields = allFields.map(f => f.getName());

    // ─── HELPERS ─────────────────────────────────────────────────────────────
    // Encode any string as UTF-16BE hex with BOM (works for both Latin and Amharic)
    const toUtf16BEHex = (str: string): PDFHexString => {
      const bytes: number[] = [0xfe, 0xff]; // BOM
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        bytes.push((code >> 8) & 0xff, code & 0xff);
      }
      return PDFHexString.of(bytes.map(b => b.toString(16).padStart(2, '0')).join(''));
    };

    // Set a text field value WITHOUT calling any pdf-lib high-level method.
    // We write V and DA directly and delete the AP stream so the viewer
    // regenerates it using the embedded font — avoiding all WinAnsi crashes.
    const setFieldDirect = (acroField: any, value: string, fontName: string, fontSize: number) => {
      try {
        // Value: always UTF-16BE so both Latin and Amharic work
        acroField.dict.set(PDFName.of('V'), toUtf16BEHex(value));
        // Default Appearance tells the viewer which font/size to use
        const da = `/${fontName} ${fontSize} Tf 0 g`;
        acroField.dict.set(PDFName.of('DA'), pdfDoc.context.obj(da));
        // Delete widget-level AP streams so the viewer builds them from scratch
        acroField.getWidgets().forEach((w: any) => {
          w.dict.delete(PDFName.of('AP'));
          // Also propagate DA to widget level for maximum compatibility
          w.dict.set(PDFName.of('DA'), pdfDoc.context.obj(da));
        });
      } catch (e) {
        console.warn('setFieldDirect failed:', e);
      }
    };

    const timesRomanFontName = timesRomanFont.name;
    const amharicFontName = amharicFont?.name || null;

    const fillField = async (possibleNames: string[], value: unknown, customFontSize?: number) => {
      if (value === undefined || value === null || value === '') return;
      const strValue = String(value);
      if (strValue.trim() === '') return;

      const hasAmharic = /[\u1200-\u137F]/.test(strValue);

      // Find exact matches first, then fallback to case-insensitive if needed
      let matches = availableFields.filter(actualName =>
        possibleNames.includes(actualName)
      );

      if (matches.length === 0) {
        matches = availableFields.filter(actualName =>
          possibleNames.some(p => p.toLowerCase() === actualName.toLowerCase())
        );
      }

      if (matches.length === 0) {
        console.warn(`No PDF field match found for any of: ${possibleNames.join(', ')}`);
        return;
      }

      for (const matchedName of matches) {
        try {
          const field = form.getField(matchedName);
          console.log(`[PDF-ENGINE] Filling field "${matchedName}" with value: "${strValue}"`);

          // Image fields (PDFButton type in the PDF)
          if ((matchedName.toLowerCase().includes('image') || matchedName.toLowerCase().includes('logo'))
            && strValue.startsWith('data:image')) {
            try {
              const parts = strValue.split(',');
              const imgBytes = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
              let img: any;
              try { img = await pdfDoc.embedPng(imgBytes); }
              catch { img = await pdfDoc.embedJpg(imgBytes); }
              // setImage() is now safe because pdfDoc.save({ updateFieldAppearances: false })
              // prevents the global appearance update that used to crash on Amharic fields.
              try { form.getButton(matchedName).setImage(img); }
              catch { /* not a button field, skip */ }
            } catch (e) { console.error('Image embed err:', e); }
            continue;
          }

          if (field instanceof PDFTextField) {
            const acroField = (field as any).acroField;
            const isAmharicField = /amharic/i.test(matchedName);
            // Use Amharic font if: (a) value contains Amharic chars, OR (b) field name says amharic
            const useAmharic = Boolean(amharicFontName && (hasAmharic || isAmharicField));
            const fontName = useAmharic ? amharicFontName! : timesRomanFontName;
            const fontSize = customFontSize || (useAmharic ? 10 : 10);
            setFieldDirect(acroField, strValue, fontName, fontSize);
          }
        } catch (e) {
          console.warn(`fillField error for ${matchedName}:`, e);
        }
      }
    };

    const setCheckbox = (value: unknown, names: string[]) => {
      const actualName = availableFields.find(f =>
        names.some(n => n.trim().toLowerCase() === f.trim().toLowerCase())
      );
      if (!actualName) return;
      try {
        const field = form.getField(actualName);
        // Use low-level dict writes for BOTH text and checkbox fields.
        // NEVER call .check()/.uncheck() or .setText()/.updateAppearances() because
        // those high-level methods trigger a GLOBAL updateAppearances() sweep across
        // ALL form fields, which crashes on any field containing Amharic text.
        if (field instanceof PDFTextField) {
          setFieldDirect((field as any).acroField, value ? 'X' : '', timesRomanFontName, 10);
        } else if (field instanceof PDFCheckBox) {
          const acroField = (field as any).acroField;
          // Get the 'on' value name (usually 'Yes' or the export value like 'Checked')
          let onValue: any;
          try { onValue = (field as any).getOnValue?.() || PDFName.of('Yes'); }
          catch { onValue = PDFName.of('Yes'); }
          const state = value ? onValue : PDFName.of('Off');
          // Set /V (value) at the field level
          acroField.dict.set(PDFName.of('V'), state);
          // Set /AS (appearance state) at each widget level + delete stale AP
          acroField.getWidgets().forEach((w: any) => {
            w.dict.set(PDFName.of('AS'), state);
            w.dict.delete(PDFName.of('AP'));
          });
        }
      } catch (e) {
        console.warn(`setCheckbox error for ${actualName}:`, e);
      }
    };

    const isRenewal = pdfUrl.includes('renewal_form.pdf');
    console.log(`[PDF-ENGINE] Detected form type: ${isRenewal ? 'RENEWAL' : 'APPLICATION'}`);

    if (isRenewal) {
      console.log('--- Filling Renewal Form ---');
      await fillField(['renewal_applicant_name'], data.renewal_applicant_name);
      await fillField(['renewal_applicant_name_amharic'], data.renewal_applicant_name_amharic, 11);
      await fillField(['renewal_address_street'], data.renewal_address_street);
      await fillField(['renewal_address_zone'], data.renewal_address_zone);
      await fillField(['renewal_city_code'], data.renewal_city_code, 9);
      await fillField(['renewal_city_name'], data.renewal_city_name);
      await fillField(['renewal_state_code'], data.renewal_state_code, 9);
      await fillField(['renewal_state_name'], data.renewal_state_name, 10);
      await fillField(['renewal_zip_code'], data.renewal_zip_code, 9);
      await fillField(['renewal_wereda'], data.renewal_wereda, 9);
      await fillField(['renewal_house_no'], data.renewal_house_no, 9);
      await fillField(['renewal_telephone'], data.renewal_telephone, 9);
      await fillField(['renewal_email'], data.renewal_email, 9);
      await fillField(['renewal_fax'], data.renewal_fax, 9);
      await fillField(['renewal_po_box'], data.renewal_po_box, 9);
      await fillField(['renewal_nationality'], data.renewal_nationality, 8);
      await fillField(['renewal_residence_country'], data.renewal_residence_country ? `      ${data.renewal_residence_country}` : '', 9);

      setCheckbox(data.renewal_chk_female, ['renewal_chk_female']);
      setCheckbox(data.renewal_chk_male, ['renewal_chk_male']);
      setCheckbox(data.renewal_chk_company, ['renewal_chk_company']);

      await fillField(['renewal_agent_name'], data.renewal_agent_name);
      await fillField(['renewal_agent_country'], data.renewal_agent_country);
      await fillField(['renewal_agent_city'], data.renewal_agent_city);
      await fillField(['renewal_agent_subcity'], data.renewal_agent_subcity);
      await fillField(['renewal_agent_wereda'], data.renewal_agent_wereda);
      await fillField(['renewal_agent_house_no'], data.renewal_agent_house_no);
      await fillField(['renewal_agent_telephone'], data.renewal_agent_telephone);
      await fillField(['renewal_agent_email'], data.renewal_agent_email);
      await fillField(['renewal_agent_pobox'], data.renewal_agent_pobox);
      await fillField(['renewal_agent_fax'], data.renewal_agent_fax);

      setCheckbox(data.renewal_chk_goods_mark, ['renewal_chk_goods_mark']);
      setCheckbox(data.renewal_chk_service_mark, ['renewal_chk_service_mark']);
      setCheckbox(data.renewal_chk_collective_mark, ['renewal_chk_collective_mark']);

      await fillField(['renewal_mark_logo'], data.renewal_mark_logo);
      await fillField(['renewal_app_no'], data.renewal_app_no);
      await fillField(['renewal_reg_no'], data.renewal_reg_no);
      await fillField(['renewal_reg_date'], data.renewal_reg_date);
      await fillField(['renewal_goods_services_1'], data.renewal_goods_services_1);
      await fillField(['renewal_goods_services_2'], data.renewal_goods_services_2);
      await fillField(['renewal_goods_services_3'], data.renewal_goods_services_3);
      await fillField(['renewal_goods_services_4'], data.renewal_goods_services_4);
      await fillField(['renewal_goods_services_5'], data.renewal_goods_services_5);
      await fillField(['renewal_goods_services_6'], data.renewal_goods_services_6);
      await fillField(['renewal_sign_day'], data.renewal_sign_day);
      await fillField(['renewal_sign_month'], data.renewal_sign_month);
      await fillField(['renewal_sign_year'], data.renewal_sign_year);

    } else {
      console.log('--- Filling Application Form ---');
      // I. Applicant Details
      console.log('--- Section I ---');
      await fillField(['applicant_name_english'], data.applicant_name_english);
      
      const appAmharicName = data.applicant_name_amharic || (data as any).renewal_applicant_name_amharic;
      console.log('[PDF-ENGINE] Filling applicant_name_amharic with:', appAmharicName);
      await fillField(['applicant_name_amharic'], appAmharicName, 11);
      
      await fillField(['address_street'], data.address_street);
      await fillField(['address_zone'], data.address_zone);
      await fillField(['city_code'], data.city_code, 9);
      await fillField(['city_name'], data.city_name);
      await fillField(['state_code'], data.state_code, 9);
      await fillField(['state_name'], data.state_name, 10);
      await fillField(['zip_code'], data.zip_code, 9);
      await fillField(['wereda'], data.wereda, 9);
      await fillField(['house_no'], data.house_no, 9);
      await fillField(['telephone'], data.telephone, 9);
      await fillField(['email'], data.email, 9);
      await fillField(['fax'], data.fax, 9);
      await fillField(['po_box'], data.po_box, 9);
      await fillField(['nationality'], data.nationality, 8);
      await fillField(['residence_country'], data.residence_country ? `      ${data.residence_country}` : '', 9);

      setCheckbox(data.chk_female, ['chk_female']);
      setCheckbox(data.chk_male, ['chk_male']);
      setCheckbox(data.chk_company, ['chk_company']);

      // II. Agent Details
      console.log('--- Section II: Agent Details ---');
      await fillField(['agent_name'], data.agent_name);
      await fillField(['agent_country'], data.agent_country);
      await fillField(['agent_city'], data.agent_city);
      await fillField(['agent subcity', 'agent_subcity'], data.agent_subcity);
      await fillField(['agent_woreda'], data.agent_woreda);
      await fillField(['agent_house_no'], data.agent_house_no);
      await fillField(['agent_telephone'], data.agent_telephone);
      await fillField(['agent_email'], data.agent_email);
      await fillField(['agent_po_box'], data.agent_po_box);
      await fillField(['agent_fax'], data.agent_fax);

      // III. Use of Mark
      console.log('--- Section III ---');
      setCheckbox(data.chk_goods, ['chk_goods']);
      setCheckbox(data.chk_services, ['chk_services']);
      setCheckbox(data.chk_collective, ['chk_collective']);

      // IV. Mark Specification
      console.log('--- Section IV ---');
      setCheckbox(data.mark_type_figurative, ['mark_type_figurative']);
      setCheckbox(data.mark_type_word, ['mark_type_word']);
      setCheckbox(data.mark_type_mixed, ['mark_type_mixed']);
      setCheckbox(data.mark_type_three_dim, ['mark_type_three_dim']);
      await fillField(['mark_description'], data.mark_description);
      await fillField(['mark_translation'], data.mark_translation);
      await fillField(['mark_transliteration'], data.mark_transliteration);
      await fillField(['mark_language_requiring_traslation'], data.mark_language_requiring_traslation);
      await fillField(['mark_has_three_dim_features'], data.mark_has_three_dim_features);
      await fillField(['mark_color_indication'], data.mark_color_indication);
      await fillField(['image_field'], data.image_field);

      // V. Priority Right
      console.log('--- Section V ---');
      await fillField(['priority_filing_date'], data.priority_filing_date);
      await fillField(['priority_country'], data.priority_country);
      await fillField(['goods_and_services_covered_by_the_previous_application'], data.goods_and_services_covered_by_the_previous_application);
      await fillField(['priority_right_declaration'], data.priority_right_declaration);
      setCheckbox(data.chk_priority_accompanies, ['chk_priority_accompanies']);
      setCheckbox(data.chk_priority_submitted_later, ['chk_priority_submitted_later']);

      // VI. Classification
      console.log('--- Section VI ---');
      await fillField(['goods_services_list_1'], data.goods_services_list_1);
      await fillField(['goods_services_list_2'], data.goods_services_list_2);
      await fillField(['goods_services_list_3'], data.goods_services_list_3);
      await fillField(['goods_services_list_4'], data.goods_services_list_4);
      await fillField(['goods_services_list_5'], data.goods_services_list_5);
      await fillField(['goods_services_list_6'], data.goods_services_list_6);
      await fillField(['disclaimer_text_amharic'], data.disclaimer_text_amharic);
      await fillField(['disclaimer_text_english'], data.disclaimer_text_english);

      // VII. Checklist & Signature
      console.log('--- Section VII ---');
      setCheckbox(data.chk_list_copies, ['chk_list_copies']);
      setCheckbox(data.chk_list_status, ['chk_list_status']);
      setCheckbox(data.chk_list_poa, ['chk_list_poa']);
      setCheckbox(data.chk_list_priority_docs, ['chk_list_priority_docs']);
      setCheckbox(data.chk_list_drawing, ['chk_list_drawing']);
      setCheckbox(data.chk_list_payment, ['chk_list_payment']);
      setCheckbox(data.chk_list_other, ['chk_list_other']);
      await fillField(['other_documents_text'], data.other_documents_text);
      await fillField(['applicant_sign_day'], data.applicant_sign_day);
      await fillField(['applicant_sign_month'], data.applicant_sign_month);
      await fillField(['applicant_sign_year_en'], data.applicant_sign_year_en);
    }

    // ===== NUCLEAR FINAL SWEEP =====
    // Delete AP streams from ALL TEXT fields (not buttons) so pdf-lib's save
    // doesn't call defaultUpdateAppearances with WinAnsi on any text field.
    // We must SKIP PDFButton fields — their AP contains the image we just embedded.
    form.getFields().forEach(field => {
      if (field instanceof PDFCheckBox || field instanceof PDFTextField) {
        try {
          (field as any).acroField.getWidgets().forEach((w: any) => {
            w.dict.delete(PDFName.of('AP'));
          });
        } catch { /* ignore */ }
      }
      // PDFButton fields are intentionally skipped to preserve their image AP stream
    });

    // Flatten only if no Amharic content — form.flatten() calls updateAppearances on ALL fields
    const hasAnyAmharic = Object.values(data).some(
      v => typeof v === 'string' && /[\u1200-\u137F]/.test(v)
    );
    if (shouldFlatten && !hasAnyAmharic) {
      try { form.flatten(); }
      catch (e) { console.warn('flatten() failed:', e); }
    }

    // Final: NeedAppearances = false so viewers use our DA+V, not Helvetica/WinAnsi auto-render.
    try {
      form.acroForm.dict.set(PDFName.of('NeedAppearances'), pdfDoc.context.obj(false));
    } catch { /* ignore */ }

    // CRITICAL: Pass { updateFieldAppearances: false } to pdfDoc.save().
    // pdf-lib's save() defaults to updateFieldAppearances=true, which internally calls
    // form.updateFieldAppearances() → field.defaultUpdateAppearances() on EVERY field.
    // When any field contains Amharic text, this crashes with "WinAnsi cannot encode".
    // This single option is the definitive fix for the WinAnsi crash.
    const pdfBytes = await pdfDoc.save({ updateFieldAppearances: false });
    return pdfBytes
  } catch (error) {
    console.error('Error filling PDF:', error)
    throw error
  }
}
