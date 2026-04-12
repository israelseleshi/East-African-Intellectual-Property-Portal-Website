import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function inspect() {
    const data = fs.readFileSync('c:/Users/israe/OneDrive/Documents/Websites/TPMS/TPMS/client/public/renewal_form.pdf');
    const pdfDoc = await PDFDocument.load(data);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log('--- DETECTED PDF FIELDS ---');
    fields.forEach((f, i) => {
        console.log(`${i + 1}. Name: "${f.getName()}" | Type: ${f.constructor.name}`);
    });
    console.log('Total Fields:', fields.length);
}

inspect().catch(console.error);
