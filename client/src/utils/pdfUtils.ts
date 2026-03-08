import { PDFDocument, StandardFonts, PDFFont, PDFTextField, PDFCheckBox, PDFObject, PDFName, PDFArray, PDFDict } from 'pdf-lib'
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

    console.log('--- DETECTED PDF FIELDS ---');
    fields.forEach(f => {
      console.log(`Name: "${f.getName()}" | Type: ${f.constructor.name}`);
    });
    console.log('Total Fields:', fields.length);
    console.log('---------------------------');

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
    console.log(`[fillPdfForm] Fetching PDF from: ${pdfUrl}`);
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log(`[fillPdfForm] PDF loaded, size: ${arrayBuffer.byteLength} bytes`);
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    pdfDoc.registerFontkit(fontkit);
    // Load Amharic font (Ebrima)
    let amharicFont: PDFFont | null = null;
    try {
      const fontUrl = '/fonts/ebrima.ttf';
      const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
      amharicFont = await pdfDoc.embedFont(fontBytes);
    } catch (_e) {
      console.warn('Failed to load local Amharic font, trying fallback...', _e);
      // Fallback logic if needed
    }

    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const form = pdfDoc.getForm();
    const allFields = form.getFields();
    // Early Repair: Fix malformed fields that lack a Rect entry before filling anything
    // This prevents "Expected instance of PDFArray2, but got instance of undefined" crash
    allFields.forEach(field => {
      try {
        const widgets = (field as any).acroField.getWidgets();
        widgets.forEach((widget: any) => {
          try {
            const rect = widget.dict.get(PDFName.of('Rect'));
            if (!rect || !(rect instanceof PDFArray)) {
              console.warn(`Field ${field.getName()} has no valid Rect, repairing at load time...`);
              widget.dict.set(PDFName.of('Rect'), pdfDoc.context.obj([0, 0, 0, 0]));
            }
          } catch (rectErr) {
            console.error(`Failed to repair Rect for widget of field ${field.getName()}`, rectErr);
          }
        });
      } catch (e) {
        // Some fields might not have widgets or acroField accessor might fail
      }
    });

    const availableFields = allFields.map(f => f.getName());

    const fillField = async (possibleNames: string[], value: unknown, customFontSize?: number) => {
      if (value === undefined || value === null || value === '') return;
      const strValue = String(value);

      // Detect if the value contains Amharic characters (Ethiopic script range)
      const hasAmharic = /[\u1200-\u137F]/.test(strValue);

      const match = possibleNames.find(name =>
        availableFields.some(f => f.trim().toLowerCase() === name.trim().toLowerCase())
      );

      if (match) {
        try {
          const matchedName = availableFields.find(f => f.trim().toLowerCase() === match.trim().toLowerCase())!;
          
          let field;
          try {
            field = form.getField(matchedName);
          } catch (e) {
            console.warn(`Could not get field ${matchedName}:`, e);
            return;
          }

          // Handle Image Embedding for fields that look like images
          const isImageField = matchedName.toLowerCase().includes('image') || 
                               matchedName.toLowerCase().includes('logo') || 
                               matchedName.toLowerCase().includes('placeholder');
          
          if (isImageField && (strValue.startsWith('data:image') || strValue.startsWith('/uploads/'))) {
            try {
              console.log('Embedding image into field:', matchedName);
              
              // Handle both base64 and URL-based images
              let imageBytes: Uint8Array;
              let mimeType = '';
              if (strValue.startsWith('data:image')) {
                const parts = strValue.split(',');
                mimeType = parts[0];
                imageBytes = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
              } else {
                const url = strValue.startsWith('http') ? strValue : window.location.origin + strValue;
                const imgRes = await fetch(url);
                imageBytes = new Uint8Array(await imgRes.arrayBuffer());
                mimeType = imgRes.headers.get('Content-Type') || '';
              }
              
              let image;
              const isPng = mimeType.includes('png') || (imageBytes[0] === 0x89 && imageBytes[1] === 0x50);
              const isJpeg = mimeType.includes('jpeg') || (imageBytes[0] === 0xFF && imageBytes[1] === 0xD8);
              
              if (isPng) image = await pdfDoc.embedPng(imageBytes);
              else if (isJpeg) image = await pdfDoc.embedJpg(imageBytes);
              else {
                try { image = await pdfDoc.embedPng(imageBytes); }
                catch { image = await pdfDoc.embedJpg(imageBytes); }
              }

              // Try to set image on button if it's a button
              try {
                const button = form.getButton(matchedName);
                button.setImage(image);
                return;
              } catch (btnErr) {
                console.warn(`Field ${matchedName} is not a button, cannot setImage:`, btnErr);
                // Fallback to text if it's an image string being set in a text field (unlikely but safe)
              }
            } catch (imgErr) {
              console.error('Error embedding image into field:', imgErr);
            }
          }

          // Fallback to text if not an image
          if (field instanceof PDFTextField) {
            const textField = field as any;
            
            // Apply font based on content BEFORE setting text
            try {
              if (hasAmharic && amharicFont) {
                textField.updateAppearances(amharicFont);
                // Explicitly set the font on the field's default appearance string
                // and the widget's appearance stream to avoid WinAnsi fallback
                const widgets = textField.acroField.getWidgets();
                widgets.forEach((widget: any) => {
                  // Ebrima usually has better scaling than Abyssinica SIL
                  const appearance = `/${amharicFont!.name} 11 Tf 0 g`;
                  widget.dict.set(PDFName.of('DA'), pdfDoc.context.obj(appearance));
                });
                
                textField.setFontSize(11);
              } else if (timesRomanFont) {
                textField.updateAppearances(timesRomanFont);
                textField.setFontSize(customFontSize || 11);
              }
            } catch (appearErr) {
              console.warn(`Could not update appearances for field ${matchedName}:`, appearErr);
            }

            const currentText = textField.getText() || '';
            if (currentText.length < strValue.length) {
              const maxLen = textField.getMaxLength();
              if (maxLen && strValue.length > maxLen) {
                textField.setMaxLength(strValue.length + 10);
              }
            }
            
            textField.setText(strValue);
          }
        } catch (e) {
          console.error(`Error filling field ${match}:`, e);
        }
      }
    };

    const setCheckbox = (value: unknown, names: string[]) => {

      const match = names.find(name =>
        availableFields.some(f => f.trim().toLowerCase() === name.trim().toLowerCase())
      );

      if (match) {
        let actualFieldName = "";
        try {
          actualFieldName = availableFields.find(f => f.trim().toLowerCase() === match.trim().toLowerCase())!;
          const field = form.getField(actualFieldName);

          if (field instanceof PDFTextField) {
            if (value) {
              field.setText('X');
            } else {
              field.setText('');
            }
            try {
              field.setFontSize(10);
              field.updateAppearances(timesRomanBoldFont);
            } catch (appearErr) {
              console.warn(`Could not update appearances for checkbox text field ${actualFieldName}:`, appearErr);
            }
          } else if (field instanceof PDFCheckBox) {
            if (value) {
              field.check();
            } else {
              field.uncheck();
            }
          } else {
            console.warn(`Field ${actualFieldName} is neither TextField nor CheckBox: ${field.constructor.name}`);
          }
        } catch (e) {
          console.warn(`Failed to set checkbox for ${actualFieldName || match}`, e);
        }
      }
    };

    // 1. Applicant Details
    await fillField(['applicant_name_english', 'applicant_name', 'Full Name', 'Applicant Name', 'Applicant Name 1'], data.applicant_name);
    await fillField(['applicant_name_amharic', 'applicant_name_amharic_1'], data.applicant_name_amharic, 11);
    await fillField(['address_street'], data.address_street);
    await fillField(['address_zone'], data.address_zone);
    await fillField(['city_code'], data.city_code, 9);
    await fillField(['city_name'], data.city_name);
    await fillField(['state_code'], data.state_code, 9);
    await fillField(['state_name'], data.state_name, 10);
    await fillField(['zip_code'], data.zip_code, 9);
    await fillField(['wereda'], data.wereda, 9);
    await fillField(['house_no'], data.house_no, 9);

    // 2. Contact info
    await fillField(['telephone'], data.telephone, 9);
    await fillField(['email'], data.email, 9);
    await fillField(['fax'], data.fax, 9);
    await fillField(['po_box'], data.po_box, 9);
    
    // Nationality logic: Include the text as is.
    await fillField(['nationality'], data.nationality, 8);

    // Residence Country logic: Find ISO code for flag, then add spacing.
    const residenceCountry = String(data.residence_country || '');
    const countryData = countryList.find((c: any) => c.name === residenceCountry || c.value === residenceCountry);
    
    // We can't easily draw an image into a text field with pdf-lib in a simple way without 
    // more complex coordinates, but we can simulate the gap for the manual flag sticker 
    // or use unicode flag emojis if the font supports them. 
    // For now, providing the requested "left gap" via spacing.
    const residenceValWithGap = residenceCountry ? `      ${residenceCountry}` : '';
    await fillField(['residence_country'], residenceValWithGap, 9);

    // 3. Legal Personality
    setCheckbox(data.chk_female, ['chk_female', 'female']);
    setCheckbox(data.chk_male, ['chk_male', 'male']);
    setCheckbox(data.chk_company, ['chk_company', 'company']);

    // 4. Use of Trademark 
    setCheckbox(data.chk_goods, ['chk_goods', 'goods_mark']);
    setCheckbox(data.chk_services, ['chk_services', 'service_mark']);
    setCheckbox(data.chk_collective, ['chk_collective', 'collective_mark']);

    // 5. Mark Details (Page 2)
    setCheckbox(data.type_figur || data.markType === 'FIGURATIVE', ['mark_type_figurative', 'figurative']);
    setCheckbox(data.type_word || data.markType === 'WORD', ['mark_type_word', 'word']);
    setCheckbox(data.k_type_mi || data.markType === 'MIXED', ['mark_type_mixed', 'mixed']);
    setCheckbox(data.type_thre || data.markType === 'THREE_DIMENSION', ['mark_type_three_dim', 'three_dimension', 'pe_th']);

    await fillField(['mark_description'], data.mark_description);
    await fillField(['mark_translation'], data.mark_translation);
    await fillField(['mark_transliteration'], data.mark_transliteration);
    await fillField(['mark_language_requiring_traslation', 'mark_language_requiring_translation', 'mark_language_requiring_translation\t'], data.mark_language_requiring_translation);
    await fillField(['mark_has_three_dim_features'], data.mark_has_three_dim_features);
    await fillField(['mark_color_indication'], data.mark_color_indication);
    await fillField(['mark_logo_placeholder', 'mark_logo', 'logo_placeholder', 'image_field', 'graphical_representation', 'Text Field', 'image_field_1'], data.mark_image);
    await fillField(['goods_services_list'], data.goods_services_list);

    // 6. Disclaimer & Priority (Section V & VI)
    await fillField(['disclaimer_text_amharic', 'disclaimer_text'], data.disclaimer_text_amharic);
    await fillField(['disclaimer_text_english'], data.disclaimer_text_english);

    await fillField(['priority_filing_date', 'priority_application_filing_date'], data.priority_application_filing_date);
    await fillField(['priority_filing_date_1'], data.priority_filing_date);
    await fillField(['priority_country'], data.priority_country);
    await fillField(['priority_goods_services'], data.priority_goods_services);

    // 6.1 Renewal Details
    await fillField(['renewal_auth_app_no'], data.renewal_auth_app_no);
    await fillField(['renewal_auth_filing_date'], data.renewal_auth_filing_date);
    await fillField(['renewal_auth_receipt_date'], data.renewal_auth_receipt_date);
    await fillField(['renewal_auth_approved_by'], data.renewal_auth_approved_by);
    await fillField(['renewal_applicant_name'], data.renewal_applicant_name);
    await fillField(['renewal_address_street'], data.renewal_address_street);
    await fillField(['renewal_address_zone'], data.renewal_address_zone);
    await fillField(['renewal_city_name'], data.renewal_city_name);
    await fillField(['renewal_state_name'], data.renewal_state_name);
    await fillField(['renewal_zip_code'], data.renewal_zip_code);
    await fillField(['renewal_wereda'], data.renewal_wereda);
    await fillField(['renewal_house_no'], data.renewal_house_no);
    await fillField(['renewal_telephone'], data.renewal_telephone);
    await fillField(['renewal_email'], data.renewal_email);
    await fillField(['renewal_fax'], data.renewal_fax);
    await fillField(['renewal_po_box'], data.renewal_po_box);
    await fillField(['renewal_nationality'], data.renewal_nationality);
    await fillField(['renewal_residence_country'], data.renewal_residence_country);
    
    // City and State Codes for Renewal
    await fillField(['renewal_city_code'], data.renewal_city_code);
    await fillField(['renewal_state_code'], data.renewal_state_code);

    // Agent Details (Comprehensive Mapping)
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
    
    // Checkboxes
    setCheckbox(data.renewal_chk_female, ['renewal_chk_female']);
    setCheckbox(data.renewal_chk_male, ['renewal_chk_male']);
    setCheckbox(data.renewal_chk_company, ['renewal_chk_company']);
    
    setCheckbox(data.renewal_chk_goods_mark, ['renewal_chk_goods_mark']);
    setCheckbox(data.renewal_chk_service_mark, ['renewal_chk_service_mark']);
    setCheckbox(data.renewal_chk_collective_mark, ['renewal_chk_collective_mark']);
    
    await fillField(['renewal_mark_logo'], data.renewal_mark_logo);
    await fillField(['renewal_app_no'], data.renewal_app_no);
    await fillField(['renewal_reg_no'], data.renewal_reg_no);
    await fillField(['renewal_reg_date'], data.renewal_reg_date);
    await fillField(['renewal_goods_services'], data.renewal_goods_services);
    await fillField(['renewal_nice_classes'], data.renewal_nice_classes);
    await fillField(['renewal_signature'], data.renewal_signature);
    await fillField(['renewal_sign_day'], data.renewal_sign_day);
    await fillField(['renewal_sign_month'], data.renewal_sign_month);
    await fillField(['renewal_sign_year'], data.renewal_sign_year);

    await fillField(['registration_no', 'Registration No', 'Registration No.'], data.registration_no);
    await fillField(['registration_date', 'Registration Date', 'Registration Date.'], data.registration_date);
    await fillField(['application_no', 'Application No', 'Application No.'], data.application_no);

    setCheckbox(data.chk_priority_accompanies, ['chk_priority_accompanies', 'ty_acc']);
    setCheckbox(data.chk_priority_submitted_later, ['chk_priority_submitted_later', '_subn']);

    // 7. Checklist (Section VII)
    setCheckbox(data.chk_list_copies, ['chk_list_copies', 'copies']);
    setCheckbox(data.chk_list_status || data.chk_list_statues || data.chk_list_statutes, ['chk_list_status', 'chk_list_statues', 'statutes']);
    setCheckbox(data.chk_list_poa, ['chk_list_poa', 'poa']);
    setCheckbox(data.chk_list_priority_docs, ['chk_list_priority_docs', 'priority_docs']);
    setCheckbox(data.chk_list_drawing, ['chk_list_drawing', 'drawing']);
    setCheckbox(data.chk_list_payment, ['chk_list_payment', 'payment']);
    setCheckbox(data.chk_list_other, ['chk_list_other', 'other']);

    await fillField(['other_documents_text', 'chk_list_other_specify'], data.other_documents_text);
    await fillField(['applicant_signature'], data.applicant_signature);
    await fillField(['applicant_sign_day_en'], data.applicant_sign_day_en);
    await fillField(['applicant_sign_month_en', 'applicant_sign_month'], data.applicant_sign_month_en);
    await fillField(['applicant_sign_year_en', 'applicant_sign_year'], data.applicant_sign_year_en);

    // IMPORTANT: Update appearances for ALL fields to ensure they reflect current font/text
    // We already call updateAppearances(font) per field in fillField, 
    // but calling form.updateFieldAppearances() at the end can sometimes 
    // reset fonts to default if not careful. 
    if (amharicFont) {
      form.updateFieldAppearances(amharicFont);
    } else if (timesRomanFont) {
      form.updateFieldAppearances(timesRomanFont);
    }


    if (shouldFlatten) {
      try {
        form.flatten();
      } catch (e) {
        console.warn('Failed to flatten PDF form. The output PDF might still have interactive fields.', e);
      }
    }

    const pdfBytes = await pdfDoc.save()
    return pdfBytes
  } catch (error) {
    console.error('Error filling PDF:', error)
    throw error
  }
}
