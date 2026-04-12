import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.resolve(__dirname, '../client/public/application_form.pdf');

const bytes = fs.readFileSync(pdfPath);
const pdfDoc = await PDFDocument.load(bytes);
const form = pdfDoc.getForm();
const fields = form.getFields();

console.log(`\n=== PDF FIELDS (Total: ${fields.length}) ===\n`);
fields.forEach(f => {
    console.log(`  "${f.getName()}"  [${f.constructor.name}]`);
});
console.log('\n=== END ===\n');
