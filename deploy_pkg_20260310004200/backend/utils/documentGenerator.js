import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { PDFDocument } from 'pdf-lib';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateDocument(templateName, data) {
    const templatePath = path.resolve(process.cwd(), 'templates', `${templateName}.docx`);
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template ${templateName} not found at ${templatePath}`);
    }
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });
    doc.render(data);
    const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
    });
    return buf;
}
export async function exportToPdf() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText('Document exported from TPMS System');
    page.drawText('Note: Full DOCX to PDF conversion is being finalized.');
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
