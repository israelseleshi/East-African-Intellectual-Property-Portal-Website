import 'dotenv/config';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const pdfPath = path.resolve(process.cwd(), '../client/public/application_form.pdf');
console.log('Reading PDF from:', pdfPath);
const bytes = new Uint8Array(fs.readFileSync(pdfPath));
const pdfDoc = await PDFDocument.load(bytes);
const form = pdfDoc.getForm();
const fields = form.getFields();
console.log('Total fields:', fields.length);
fields.forEach(f => {
    console.log(`"${f.getName()}" [${f.constructor.name}]`);
});
