/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function listFields(pdfPath) {
  const bytes = fs.readFileSync(pdfPath);
  const pdf = await PDFDocument.load(bytes);
  const fields = pdf.getForm().getFields();
  return fields.map((f) => f.getName());
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const targets = [
    path.join(root, 'public', 'application_form.pdf'),
    path.join(root, 'public', 'renewal_form.pdf'),
  ];

  for (const pdfPath of targets) {
    const exists = fs.existsSync(pdfPath);
    console.log('='.repeat(80));
    console.log('PDF:', pdfPath);
    if (!exists) {
      console.log('missing');
      continue;
    }
    const names = await listFields(pdfPath);
    console.log('fieldCount:', names.length);
    names.forEach((n) => console.log(n));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

