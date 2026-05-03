import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { useSettingsStore } from '@/store/settingsStore';

export interface PremiumInvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  status?: string;
  clientName: string;
  clientCompany?: string;
  clientAddress?: string;
  clientCity?: string;
  clientCountry?: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    tax?: number;
    discount?: number;
  }>;
  currency?: string;
  notes?: string;
  logoUrl?: string;
}

export async function generatePremiumInvoice(data: PremiumInvoiceData): Promise<ArrayBuffer> {
  const { companyInfo } = useSettingsStore.getState();
  
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Colors based on image 2
  const primaryBlue = rgb(0, 0.62, 0.86); // Light blue from image
  const darkGray = rgb(0.1, 0.1, 0.1);
  const mediumGray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.96, 0.97, 0.98);
  const borderGray = rgb(0.8, 0.8, 0.8);
  const white = rgb(1, 1, 1);
  
  const width = 595.28;
  const height = 841.89;
  const margin = 50;
  
  // Top right accent triangles
  const bluePoints1 = `M ${width - 120} ${height} L ${width} ${height} L ${width} ${height - 10} Z`;
  page.drawSvgPath(bluePoints1, { color: primaryBlue });
  
  const bluePoints2 = `M ${width - 150} ${height} L ${width - 130} ${height} L ${width} ${height - 40} L ${width} ${height - 70} Z`;
  page.drawSvgPath(bluePoints2, { color: primaryBlue, opacity: 0.6 });

  // Bottom left accent triangles
  const bluePoints3 = `M 0 0 L 120 0 L 0 10 Z`;
  page.drawSvgPath(bluePoints3, { color: primaryBlue });

  const bluePoints4 = `M 0 40 L 0 70 L 150 0 L 130 0 Z`;
  page.drawSvgPath(bluePoints4, { color: primaryBlue, opacity: 0.6 });

  let y = height - 100;

      const logoUrl = data.logoUrl || '/eaip-logo.png';
      let logoImage;
      
      try {
        const response = await fetch(logoUrl);
        if (!response.ok) throw new Error('Logo not found on server');
        const logoImageBytes = await response.arrayBuffer();
        
        // Try embedding based on content type or extension
        const contentType = response.headers.get('content-type');
        if (contentType === 'image/png' || logoUrl.toLowerCase().endsWith('.png')) {
          logoImage = await pdfDoc.embedPng(logoImageBytes);
        } else {
          logoImage = await pdfDoc.embedJpg(logoImageBytes);
        }
      } catch (e) {
        console.warn('Could not load uploaded logo, falling back to default:', e);
        try {
          // Fallback to local default logo
          const fallbackRes = await fetch('/eaip-logo.png');
          const fallbackBytes = await fallbackRes.arrayBuffer();
          logoImage = await pdfDoc.embedPng(fallbackBytes);
        } catch (fallbackError) {
          console.error('Final logo fallback failed:', fallbackError);
        }
      }

      if (logoImage) {
        const logoDims = logoImage.scale(0.12);
        page.drawImage(logoImage, {
          x: margin,
          y: y - logoDims.height + 10,
          width: logoDims.width,
          height: logoDims.height,
        });
      }

  const invoiceTitle = 'INVOICE';
  const titleSize = 22; // Reduced from 28
  page.drawText(invoiceTitle, {
    x: width - margin - boldFont.widthOfTextAtSize(invoiceTitle, titleSize),
    y: y,
    size: titleSize,
    font: boldFont,
    color: darkGray
  });

  // Company Info (Top Right)
  y -= 30; // Reduced gap
  const companyLines = [
    companyInfo.companyName || 'East African IP',
    companyInfo.companyAddress || 'Addis Ababa, Ethiopia',
    companyInfo.companyCity || ''
  ].filter(Boolean);

  let companyY = y;
  companyLines.forEach(line => {
    const lineWidth = regularFont.widthOfTextAtSize(line, 9);
    page.drawText(line, {
      x: width - margin - lineWidth,
      y: companyY,
      size: 9,
      font: regularFont,
      color: darkGray
    });
    companyY -= 12;
  });

  y = companyY - 30;

  // Constants for layout
  const productColWidth = 250; // Maximum width for product description

  // Helper for text wrapping
  const wrapText = (text: string, maxWidth: number, font: any, size: number) => {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, size);
      if (testWidth > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // Client Info and Invoice Details (Side by Side)
  const leftCol = margin;
  const rightCol = width / 2 + 50; // Shifted right column further right

  // Client Info (Left)
  page.drawText(data.clientName, { x: leftCol, y, size: 10, font: boldFont, color: darkGray });
  y -= 14;
  if (data.clientAddress) {
    const wrappedClientAddress = wrapText(data.clientAddress, productColWidth, regularFont, 9);
    wrappedClientAddress.forEach(line => {
      page.drawText(line, { x: leftCol, y, size: 9, font: regularFont, color: darkGray });
      y -= 12;
    });
  }
  if (data.clientCity || data.clientCountry) {
    page.drawText(`${data.clientCity || ''} ${data.clientCountry || ''}`.trim(), { x: leftCol, y, size: 9, font: regularFont, color: darkGray });
    y -= 12;
  }

  // Invoice Details (Right)
  let detailY = y + 26;
  const details = [
    { label: 'Invoice Number:', value: data.invoiceNumber },
    { label: 'Invoice Date:', value: new Date(data.issueDate).toLocaleDateString() }
  ];
  if (data.dueDate) {
    details.push({ label: 'Due Date:', value: new Date(data.dueDate).toLocaleDateString() });
  }

  details.forEach(detail => {
    page.drawText(detail.label, { x: rightCol, y: detailY, size: 9, font: boldFont, color: darkGray });
    const valWidth = regularFont.widthOfTextAtSize(detail.value, 9);
    page.drawText(detail.value, { x: width - margin - valWidth, y: detailY, size: 9, font: regularFont, color: darkGray });
    detailY -= 14;
  });

  y = Math.min(y, detailY) - 40; // Adjusted spacing

  // Table Header
  page.drawText('Products', { x: leftCol, y, size: 9, font: boldFont, color: darkGray });
  page.drawText('Quantity', { x: 320, y, size: 9, font: boldFont, color: darkGray });
  page.drawText('Price', { x: 420, y, size: 9, font: boldFont, color: darkGray });
  const totalLabelWidth = boldFont.widthOfTextAtSize('Total', 9);
  page.drawText('Total', { x: width - margin - totalLabelWidth, y, size: 9, font: boldFont, color: darkGray });

  y -= 8;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.8,
    color: darkGray
  });

  y -= 18;

  // Table Rows
  let subtotal = 0;
  
  data.items.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const wrappedDescription = wrapText(item.description, productColWidth, regularFont, 9);
    let currentY = y;
    
    wrappedDescription.forEach((line, index) => {
      page.drawText(line, { x: leftCol, y: currentY, size: 9, font: regularFont, color: darkGray });
      if (index < wrappedDescription.length - 1) {
        currentY -= 12;
      }
    });

    // Draw other columns on the first line level
    page.drawText(String(item.quantity), { x: 340, y: y, size: 9, font: regularFont, color: darkGray });
    page.drawText(`${data.currency === 'USD' ? '$' : (data.currency || '')} ${item.price.toFixed(2)}`, { x: 420, y: y, size: 9, font: regularFont, color: darkGray });
    const totalStr = `${data.currency === 'USD' ? '$' : (data.currency || '')} ${itemTotal.toFixed(2)}`;
    page.drawText(totalStr, { x: width - margin - regularFont.widthOfTextAtSize(totalStr, 9), y: y, size: 9, font: regularFont, color: darkGray });

    // Update y based on number of lines in description
    y = currentY - 15;
    
    page.drawLine({
      start: { x: margin, y: y + 5 },
      end: { x: width - margin, y: y + 5 },
      thickness: 0.3,
      color: borderGray
    });
    y -= 10;
  });

  // Totals Section
  y -= 15;
  const summaryX = width - margin - 150;
  const valueX = width - margin;

  const drawSummaryLine = (label: string, value: string, isBold = false) => {
    const font = isBold ? boldFont : regularFont;
    page.drawText(label, { x: summaryX, y, size: 9, font: font, color: darkGray });
    const valStr = value;
    page.drawText(valStr, { x: valueX - font.widthOfTextAtSize(valStr, 9), y, size: 9, font: font, color: darkGray });
    y -= 18;
  };

  drawSummaryLine('Subtotal:', `${data.currency === 'USD' ? '$' : (data.currency || '')} ${subtotal.toFixed(2)}`);
  
  y -= 5;
  page.drawLine({ start: { x: summaryX, y: y + 15 }, end: { x: valueX, y: y + 15 }, thickness: 0.8, color: darkGray });
  
  y -= 5;
  drawSummaryLine('Total:', `${data.currency === 'USD' ? '$' : (data.currency || '')} ${subtotal.toFixed(2)}`, true);

  // Footer Message (Note)
  if (data.notes) {
    y -= 40;
    const notePrefix = 'Note: ';
    const prefixWidth = boldFont.widthOfTextAtSize(notePrefix, 11);
    
    page.drawText(notePrefix, {
      x: margin,
      y,
      size: 11,
      font: boldFont,
      color: darkGray
    });

    const noteContentWidth = width - 2 * margin - prefixWidth;
    const wrappedFooter = wrapText(data.notes, noteContentWidth, regularFont, 11);
    
    wrappedFooter.forEach((line, index) => {
      page.drawText(line, {
        x: margin + (index === 0 ? prefixWidth : 0),
        y: y - (index * 14),
        size: 11,
        font: regularFont,
        color: darkGray
      });
    });
    
    // Update y for subsequent content
    y -= (wrappedFooter.length * 14) + 20;
  }

  // Bottom contact info
  const bottomY = 40;
  const footerData = [
    companyInfo.companyAddress || 'Addis Ababa',
    companyInfo.companyEmail || 'info@eastafricanip.com',
    companyInfo.companyWebsite || 'www.eastafricanip.com'
  ];

  let footerX = margin;
  const spacing = (width - 2 * margin) / 3;
  footerData.forEach((text, i) => {
    page.drawText(text, {
      x: footerX + (i * spacing),
      y: bottomY,
      size: 8,
      font: regularFont,
      color: mediumGray
    });
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer as ArrayBuffer;
}
