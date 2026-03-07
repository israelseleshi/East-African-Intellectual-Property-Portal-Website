const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function listTags() {
  try {
    const pdfBytes = fs.readFileSync('application_form.pdf');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    console.log(`Found ${fields.length} fields.`);

    console.log('--- Form Tags (Field Names) ---');
    fields.forEach(field => {
      const type = field.constructor.name;
      console.log(`${field.getName()} [${type}]`);
    });
    console.log('--- End of Tags ---');
  } catch (error) {
    console.error('Error reading PDF:', error.message);
  }
}

listTags();
