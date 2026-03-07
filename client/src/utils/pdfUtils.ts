import { PDFDocument, StandardFonts, PDFFont, PDFTextField, PDFCheckBox, PDFObject } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

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
    const response = await fetch(pdfUrl)
    const arrayBuffer = await response.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)

    pdfDoc.registerFontkit(fontkit);
    // Load Amharic font (Abyssinica SIL)
    let amharicFont: PDFFont | null = null;
    try {
      const fontUrl = '/fonts/AbyssinicaSIL-Regular.ttf';
      const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
      amharicFont = await pdfDoc.embedFont(fontBytes);
    } catch (_e) {
      console.warn('Failed to load local Amharic font, trying fallback...', _e);
      // Fallback logic if needed
    }

    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const form = pdfDoc.getForm()
    const availableFields = form.getFields().map(f => f.getName());

    const fillField = async (possibleNames: string[], value: unknown, customFontSize?: number) => {
      if (value === undefined || value === null || value === '') return;
      const strValue = String(value);

      const match = possibleNames.find(name =>
        availableFields.some(f => f.toLowerCase() === name.toLowerCase())
      );

      if (match) {
        try {
          const matchedName = availableFields.find(f => f.toLowerCase() === match.toLowerCase())!;
          let field;
          try {
            field = form.getTextField(matchedName);
          } catch (e) {
            // If it's not a text field, it might be a button (common for image placeholders)
            field = form.getButton(matchedName);
          }

          // Handle Image Embedding for Logo Placeholder
          const isLogoField = matchedName.toLowerCase().includes('logo_placeholder') ||
            matchedName.toLowerCase().includes('mark_logo') ||
            matchedName.toLowerCase().includes('image_field') ||
            matchedName.toLowerCase().includes('graphical_representation');

          if (isLogoField && strValue.startsWith('data:image')) {
            try {
              console.log('Embedding image into field:', matchedName);
              const acroField = (field as any).acroField;
              const widgets = acroField.getWidgets();
              if (widgets.length > 0) {
                const widget = widgets[0];
                const rect = widget.getRectangle();

                // Get the page index
                const pages = pdfDoc.getPages();
                let page = pages[1]; // Default to Page 2
                console.log('Using page:', page.getSize());

                // Try to find which page this field is actually on
                for (let i = 0; i < pages.length; i++) {
                  const p = pages[i];
                  const annots = (p.node as any).Annots();
                  if (annots) {
                    const array = annots.asArray();
                    if (array.includes(widget.ref)) {
                      page = p;
                      break;
                    }
                  }
                }

                // Convert base64 to bytes
                const imageBase64 = strValue.split(',')[1];
                const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
                let image;
                if (strValue.includes('image/png')) {
                  image = await pdfDoc.embedPng(imageBytes);
                } else {
                  image = await pdfDoc.embedJpg(imageBytes);
                }

                const { width, height } = image.scale(1);
                const aspectRatio = width / height;

                let drawWidth = rect.width;
                let drawHeight = rect.width / aspectRatio;

                if (drawHeight > rect.height) {
                  drawHeight = rect.height;
                  drawWidth = rect.height * aspectRatio;
                }

                page.drawImage(image, {
                  x: rect.x + (rect.width - drawWidth) / 2,
                  y: rect.y + (rect.height - drawHeight) / 2,
                  width: drawWidth,
                  height: drawHeight,
                });

                // If it's a text field, clear its text to avoid overlapping
                if (matchedName.toLowerCase().includes('text')) {
                  try {
                    (field as any).setText('');
                  } catch (e) {}
                }
                return; // Image handled
              }
            } catch (imgErr) {
              console.error('Error embedding image:', imgErr);
            }
          }

          // Fallback to text if not an image or image failed
          if ('setText' in field) {
            const textField = field as any;
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
      console.log(`Attempting to set checkbox for names: ${names.join(', ')} with value: ${value}`);

      const match = names.find(name =>
        availableFields.some(f => f.toLowerCase() === name.toLowerCase())
      );

      if (match) {
        let actualFieldName = "";
        try {
          actualFieldName = availableFields.find(f => f.toLowerCase() === match.toLowerCase())!;
          console.log(`Found actual field for checkbox: ${actualFieldName}`);
          const field = form.getField(actualFieldName);

          if (field instanceof PDFTextField) {
            if (value) {
              console.log(`Setting text 'X' for text field: ${actualFieldName}`);
              field.setText('X');
            } else {
              console.log(`Clearing text field: ${actualFieldName}`);
              field.setText('');
            }
            field.setFontSize(10);
            field.updateAppearances(timesRomanBoldFont);
          } else if (field instanceof PDFCheckBox) {
            if (value) {
              console.log(`Checking checkbox: ${actualFieldName}`);
              field.check();
            } else {
              console.log(`Unchecking checkbox: ${actualFieldName}`);
              field.uncheck();
            }
          } else {
            console.warn(`Field ${actualFieldName} is neither TextField nor CheckBox: ${field.constructor.name}`);
          }
        } catch (e) {
          console.warn(`Failed to set checkbox for ${actualFieldName || match}`, e);
        }
      } else {
        console.log(`No match found in availableFields for any of: ${names.join(', ')}`);
      }
    };

    // 1. Applicant Details
    await fillField(['applicant_name_english', 'applicant_name'], data.applicant_name);
    await fillField(['applicant_name_amharic', 'applicant_name_amharic_1'], data.applicant_name_amharic);
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
    await fillField(['nationality'], data.nationality, 8);
    await fillField(['residence_country'], data.residence_country, 9);

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
    await fillField(['mark_logo_placeholder', 'mark_logo', 'logo_placeholder', 'image_field', 'graphical_representation', 'Text Field'], data.mark_image);
    await fillField(['goods_services_list'], data.goods_services_list);

    // 6. Disclaimer & Priority (Section V & VI)
    await fillField(['disclaimer_text_amharic', 'disclaimer_text'], data.disclaimer_text_amharic);
    await fillField(['disclaimer_text_english'], data.disclaimer_text_english);

    await fillField(['priority_filing_date', 'priority_application_filing_date'], data.priority_application_filing_date);
    await fillField(['priority_filing_date_1'], data.priority_filing_date);
    await fillField(['priority_country'], data.priority_country);
    await fillField(['priority_goods_services'], data.priority_goods_services);

    // 6.1 Renewal Details
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
    // Instead, we skip the global update and let the per-field updates stick.
    // form.updateFieldAppearances(timesRomanFont);

    if (shouldFlatten) {
      form.flatten();
    }

    const pdfBytes = await pdfDoc.save()
    return pdfBytes
  } catch (error) {
    console.error('Error filling PDF:', error)
    throw error
  }
}
