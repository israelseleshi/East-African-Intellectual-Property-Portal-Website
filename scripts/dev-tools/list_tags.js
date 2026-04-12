import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function listPdfTags(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found at ${filePath}`);
      return;
    }
    const data = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(data);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`\nFound ${fields.length} fields in ${path.basename(filePath)}:`);
    console.log('--------------------------------------------------');

    fields.forEach(field => {
      const type = field.constructor.name;
      const name = field.getName();
      console.log(`- Name: ${name.padEnd(30)} (Type: ${type})`);
    });

    if (fields.length === 0) {
      console.log('No form fields found in this PDF.');
    }
    console.log('--------------------------------------------------\n');
  } catch (error) {
    console.error('Error reading PDF:', error.message);
  }
}

const pdfFile = process.argv[2];
if (!pdfFile) {
  console.log('Usage: node list_tags.js <path_to_pdf>');
  process.exit(1);
}

listPdfTags(path.resolve(pdfFile));
