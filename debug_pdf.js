
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function testPdf() {
    const pdfPath = path.join('C:', 'Users', 'El-Hadar-06', 'Music', 'East-African-Intellectual-Property-Portal-Website', 'client', 'public', 'renewal_form.pdf');
    try {
        const data = fs.readFileSync(pdfPath);
        console.log(`File read successfully: ${data.length} bytes`);
        const pdfDoc = await PDFDocument.load(data);
        console.log(`PDF loaded successfully. Pages: ${pdfDoc.getPageCount()}`);
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        console.log(`Form fields found: ${fields.length}`);
        fields.forEach(f => {
            console.log(` - ${f.getName()} (${f.constructor.name})`);
        });
    } catch (err) {
        console.error('Error:', err);
    }
}

testPdf();
