import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
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
  pdfDoc.registerFontkit(fontkit);

  // Load SF Pro font
  let regularFont: any;
  let boldFont: any;

  try {
    const fontBytes = await fetch('/fonts/SFPRODISPLAYREGULAR.OTF').then(res => res.arrayBuffer());
    regularFont = await pdfDoc.embedFont(fontBytes);
    // Use the same for bold as fallback if bold file not found, or embed it if available
    boldFont = await pdfDoc.embedFont(fontBytes); 
  } catch (e) {
    console.warn('Could not load SF Pro font, falling back to Helvetica:', e);
    regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }
  
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  
  // Colors (EAIP Brand Blue)
  const primaryBlue = rgb(0.059, 0.408, 0.651); 
  const darkGray = rgb(0.1, 0.1, 0.1);
  const mediumGray = rgb(0.4, 0.4, 0.4);
  const borderGray = rgb(0.85, 0.85, 0.85);
  const white = rgb(1, 1, 1);

  const width = 595.28;
  const height = 841.89;
  const margin = 50;

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

  // --- 1. HEADER SECTION (Logo Left, Invoice Info Right) ---
  let y = height - 50;

  // Logo (Top Left)
  let logoDrawn = false;
  try {
    const logoUrl = data.logoUrl || '/eaip-logo.png';
    const response = await fetch(logoUrl);
    if (response.ok) {
      const logoImageBytes = await response.arrayBuffer();
      let logoImage;
      if (logoUrl.toLowerCase().endsWith('.png')) {
        logoImage = await pdfDoc.embedPng(logoImageBytes);
      } else {
        logoImage = await pdfDoc.embedJpg(logoImageBytes);
      }

      if (logoImage) {
        const logoDims = logoImage.scale(0.135); 
        page.drawImage(logoImage, {
          x: margin,
          y: height - margin - logoDims.height,
          width: logoDims.width,
          height: logoDims.height,
        });
        y = height - margin - logoDims.height - 25;
        logoDrawn = true;
      }
    }
  } catch (e) {
    console.warn('Logo error:', e);
  }

  // Final fallback to eaip-logo.png if something went wrong
  if (!logoDrawn) {
    try {
      const response = await fetch('/eaip-logo.png');
      if (response.ok) {
        const logoBytes = await response.arrayBuffer();
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const logoDims = logoImage.scale(0.135);
        page.drawImage(logoImage, {
          x: margin,
          y: height - margin - logoDims.height,
          width: logoDims.width,
          height: logoDims.height,
        });
        y = height - margin - logoDims.height - 25;
        logoDrawn = true;
      }
    } catch (e) {
      console.error('Final logo fallback failed:', e);
      y = height - margin - 60;
    }
  }

  // Company Name & Address (Left, Below Logo)
  page.drawText(companyInfo.companyName || 'East African IP', { 
    x: margin, 
    y, 
    size: 11, 
    font: boldFont, 
    color: primaryBlue 
  });
  y -= 15;
  
  // Use a Set to avoid duplicate address lines
  const addressLines = Array.from(new Set([
    companyInfo.companyAddress,
    companyInfo.companyCity,
    companyInfo.taxId ? `Tax ID: ${companyInfo.taxId}` : ''
  ].filter(Boolean)));

  addressLines.forEach(line => {
    page.drawText(line, { x: margin, y, size: 9, font: regularFont, color: darkGray });
    y -= 12;
  });

  // Invoice Title and Balance Due (Top Right)
  const invoiceTitle = 'INVOICE';
  page.drawText(invoiceTitle, {
    x: width - margin - boldFont.widthOfTextAtSize(invoiceTitle, 24),
    y: height - 60,
    size: 24,
    font: boldFont,
    color: primaryBlue
  });

  const invNo = `# ${data.invoiceNumber}`;
  page.drawText(invNo, {
    x: width - margin - regularFont.widthOfTextAtSize(invNo, 10),
    y: height - 85,
    size: 10,
    font: regularFont,
    color: darkGray
  });

  // Balance Due (Top Right)
  const totalAmount = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const balanceDueLabel = 'Balance Due';
  page.drawText(balanceDueLabel, {
    x: width - margin - regularFont.widthOfTextAtSize(balanceDueLabel, 10),
    y: height - 120,
    size: 10,
    font: regularFont,
    color: mediumGray
  });

  const balanceDueValue = `${data.currency === 'USD' ? '$' : (data.currency || '')} ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  page.drawText(balanceDueValue, {
    x: width - margin - boldFont.widthOfTextAtSize(balanceDueValue, 18),
    y: height - 145,
    size: 18,
    font: boldFont,
    color: darkGray
  });

  // --- 2. BILLING INFO SECTION ---
  // Horizontal line separating header from billing info
  const separatorY = Math.min(y - 20, height - 165);
  page.drawLine({
    start: { x: margin, y: separatorY },
    end: { x: width - margin, y: separatorY },
    thickness: 1,
    color: borderGray
  });

  y = separatorY - 30;
  const leftColX = margin;
  const rightColX = width / 2 + 50;

  // Bill To (Left)
  page.drawText('Invoice To:', { x: leftColX, y, size: 9, font: regularFont, color: mediumGray });
  y -= 15;
  page.drawText(data.clientName, { x: leftColX, y, size: 10, font: boldFont, color: primaryBlue });
  y -= 14;
  if (data.clientAddress) {
    const wrappedAddress = wrapText(data.clientAddress, 220, regularFont, 9);
    wrappedAddress.forEach((line: string) => {
      page.drawText(line, { x: leftColX, y, size: 9, font: regularFont, color: darkGray });
      y -= 12;
    });
  }

  // Invoice Details (Right)
  let detailY = separatorY - 30;
  const details = [
    { label: 'Invoice Date:', value: new Date(data.issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
    { label: 'Invoice Due:', value: data.dueDate ? new Date(data.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Due on Receipt' }
  ];

  details.forEach(detail => {
    // Aligned labels and values closer
    const labelX = width - margin - 180;
    page.drawText(detail.label, { x: labelX, y: detailY, size: 9, font: regularFont, color: darkGray });
    const valWidth = regularFont.widthOfTextAtSize(detail.value, 9);
    page.drawText(detail.value, { x: width - margin - valWidth, y: detailY, size: 9, font: regularFont, color: darkGray });
    detailY -= 14;
  });

  y = Math.min(y, detailY) - 40;

  // --- 3. PRODUCTS TABLE SECTION ---
  const tableHeaderHeight = 25;
  page.drawRectangle({
    x: margin,
    y: y - tableHeaderHeight + 7,
    width: width - 2 * margin,
    height: tableHeaderHeight,
    color: primaryBlue
  });

  const headerTextY = y - tableHeaderHeight + 14;
  page.drawText('#', { x: margin + 10, y: headerTextY, size: 9, font: boldFont, color: white });
  page.drawText('Item & Description', { x: margin + 40, y: headerTextY, size: 9, font: boldFont, color: white });
  page.drawText('Qty', { x: 380, y: headerTextY, size: 9, font: boldFont, color: white });
  page.drawText('Rate', { x: 440, y: headerTextY, size: 9, font: boldFont, color: white });
  page.drawText('Amount', { x: width - margin - 50, y: headerTextY, size: 9, font: boldFont, color: white });

  y -= (tableHeaderHeight + 15);

  // Table Rows
  let subtotal = 0;
  data.items.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    
    const itemY = y;
    
    // Draw row background for alternating rows
    if (index % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: itemY - 18,
        width: width - 2 * margin,
        height: 25,
        color: rgb(0.98, 0.98, 0.98),
      });
    }

    page.drawText(String(index + 1), { x: margin + 10, y: itemY, size: 9, font: regularFont, color: darkGray });
    
    const wrappedDesc = wrapText(item.description, 250, regularFont, 9);
    wrappedDesc.forEach((line: string, lIndex: number) => {
      page.drawText(line, { x: margin + 40, y: itemY - (lIndex * 12), size: 9, font: regularFont, color: darkGray });
    });

    const qtyStr = item.quantity.toFixed(2);
    const rateStr = item.price.toLocaleString(undefined, { minimumFractionDigits: 2 });
    const totalStr = itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2 });

    page.drawText(qtyStr, { x: 380, y: itemY, size: 9, font: regularFont, color: darkGray });
    page.drawText(rateStr, { x: 440, y: itemY, size: 9, font: regularFont, color: darkGray });
    page.drawText(totalStr, { x: width - margin - regularFont.widthOfTextAtSize(totalStr, 9) - 5, y: itemY, size: 9, font: regularFont, color: darkGray });

    const rowHeight = Math.max(wrappedDesc.length * 12 + 10, 25);
    y -= rowHeight;
    
    page.drawLine({
      start: { x: margin, y: y + 5 },
      end: { x: width - margin, y: y + 5 },
      thickness: 0.3,
      color: borderGray
    });
  });

  // --- 4. TOTALS SECTION ---
  y -= 15;
  const drawTotalLine = (label: string, value: string, isBold = false) => {
    const font = isBold ? boldFont : regularFont;
    const labelX = width - margin - 180;
    page.drawText(label, { x: labelX, y, size: 9, font: font, color: darkGray });
    const valWidth = font.widthOfTextAtSize(value, 9);
    page.drawText(value, { x: width - margin - valWidth - 5, y, size: 9, font: font, color: darkGray });
    y -= 14;
  };

  drawTotalLine('Sub Total', subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 }));
  drawTotalLine('Total', subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), true);

  y -= 10;
  // Balance Due Banner
  page.drawRectangle({
    x: width / 2,
    y: y - 10,
    width: width / 2 - margin,
    height: 25,
    color: primaryBlue
  });
  page.drawText('Balance Due', { x: width / 2 + 20, y: y - 2, size: 10, font: boldFont, color: white });
  const finalBalance = `${data.currency === 'USD' ? '$' : (data.currency || '')} ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  page.drawText(finalBalance, { x: width - margin - boldFont.widthOfTextAtSize(finalBalance, 10) - 10, y: y - 2, size: 10, font: boldFont, color: white });

  y -= 60;

  // --- 5. NOTES SECTION (Left Aligned) ---
  if (data.notes) {
    const notePrefix = 'Note: ';
    const prefixWidth = boldFont.widthOfTextAtSize(notePrefix, 11);
    page.drawText(notePrefix, { x: margin, y, size: 11, font: boldFont, color: darkGray });

    const wrappedNotes = wrapText(data.notes, width - 2 * margin - prefixWidth, regularFont, 11);
    wrappedNotes.forEach((line: string, index: number) => {
      page.drawText(line, {
        x: margin + (index === 0 ? prefixWidth : 0),
        y: y - (index * 14),
        size: 11,
        font: regularFont,
        color: darkGray
      });
    });
    y -= (wrappedNotes.length * 14) + 30;
  }

  // --- 6. FOOTER SECTION ---
  const bottomY = 40;
  
  // Add line above footer
  page.drawLine({
    start: { x: margin, y: bottomY + 15 },
    end: { x: width - margin, y: bottomY + 15 },
    thickness: 0.5,
    color: borderGray
  });

  const footerData = [
    companyInfo.companyAddress || 'Addis Ababa',
    companyInfo.companyPhone || '+251 11 111 1111',
    companyInfo.companyEmail || 'info@eastafricanip.com',
    companyInfo.companyWebsite || 'www.eastafricanip.com'
  ].filter(Boolean);

  const footerWidthAvailable = width - 2 * margin;
  const itemSpacing = footerWidthAvailable / (footerData.length - 1);
  
  footerData.forEach((text, i) => {
    const textWidth = regularFont.widthOfTextAtSize(text, 8);
    let xPos;
    if (i === 0) xPos = margin;
    else if (i === footerData.length - 1) xPos = width - margin - textWidth;
    else xPos = margin + (i * itemSpacing) - (textWidth / 2);

    page.drawText(text, { x: xPos, y: bottomY, size: 8, font: regularFont, color: mediumGray });
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer as ArrayBuffer;
}
