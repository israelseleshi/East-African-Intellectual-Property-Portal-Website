export interface InvoiceData {
  invoiceNumber: string
  issueDate: string
  dueDate?: string
  clientName: string
  trademark?: string
  items: Array<{ description: string; amount: number }>
  amount: number
  currency?: string
  method?: string
  notes?: string
  companyInfo: {
    companyName?: string
    companyAddress?: string
    companyCity?: string
    companyEmail?: string
    companyWebsite?: string
    companyPhone?: string
    logoUrl?: string
  }
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Color palette (60-30-10) - Clean & Minimal
  const navy = rgb(0.059, 0.102, 0.18) // #0F1A2E - Primary
  const white = rgb(1, 1, 1)
  const lightGray = rgb(0.95, 0.95, 0.95)
  const darkGray = rgb(0.2, 0.2, 0.2)
  const mediumGray = rgb(0.4, 0.4, 0.4)
  const subtleLine = rgb(0.85, 0.85, 0.85)

  const marginLeft = 60
  const marginRight = 535
  const pageWidth = 595.28
  const contentWidth = marginRight - marginLeft
  const headerHeight = 150
  const sectionGap = 55

  // --- CLEAN BLUE HEADER ---
  page.drawRectangle({
    x: 0,
    y: 841.89 - headerHeight,
    width: pageWidth,
    height: headerHeight,
    color: navy
  })

  page.drawLine({
    start: { x: 0, y: 841.89 - headerHeight },
    end: { x: pageWidth, y: 841.89 - headerHeight },
    thickness: 0.5,
    color: white
  })

  // Logo
  try {
    const logoSrc = data.companyInfo.logoUrl || '/eaip-logo.png'
    let logoImageBytes: Uint8Array
    if (logoSrc.startsWith('data:')) {
      const base64 = logoSrc.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      logoImageBytes = bytes
    } else {
      const res = await fetch(logoSrc)
      const arrayBuffer = await res.arrayBuffer()
      logoImageBytes = new Uint8Array(arrayBuffer)
    }
    let logoImage
    if (logoSrc.includes('.png') || logoSrc.startsWith('data:image/png')) {
      logoImage = await pdfDoc.embedPng(logoImageBytes)
    } else {
      logoImage = await pdfDoc.embedJpg(logoImageBytes)
    }
    const logoDims = logoImage.scale(0.16)
    const logoX = marginLeft
    const logoY = 841.89 - headerHeight + (headerHeight - logoDims.height) / 2
    page.drawImage(logoImage, { x: logoX, y: logoY, width: logoDims.width, height: logoDims.height })
  } catch (e) {
    console.warn('Could not load logo for PDF', e)
  }

  // Company info (right side)
  const companyLines: Array<{ text: string; size: number; font: any; color: any }> = [
    { text: data.companyInfo.companyName || 'EAST AFRICAN INTELLECTUAL PROPERTY', size: 16, font: boldFont, color: white },
    { text: data.companyInfo.companyAddress ? `${data.companyInfo.companyAddress}, ${data.companyInfo.companyCity || 'Addis Ababa'}` : 'Addis Ababa, Ethiopia', size: 9.5, font: regularFont, color: lightGray },
  ]
  if (data.companyInfo.companyEmail) companyLines.push({ text: data.companyInfo.companyEmail, size: 9.5, font: regularFont, color: lightGray })
  if (data.companyInfo.companyWebsite) companyLines.push({ text: data.companyInfo.companyWebsite, size: 9.5, font: regularFont, color: lightGray })
  if (data.companyInfo.companyPhone) companyLines.push({ text: data.companyInfo.companyPhone, size: 9.5, font: regularFont, color: lightGray })

  let companyY = 841.89 - 40
  companyLines.forEach(line => {
    const textWidth = line.font.widthOfTextAtSize(line.text, line.size)
    page.drawText(line.text, { x: pageWidth - textWidth - marginLeft, y: companyY, size: line.size, font: line.font, color: line.color })
    companyY -= (line.size + 7)
  })

  // Invoice title
  const invoiceTitle = 'INVOICE'
  const titleSize = 32
  page.drawText(invoiceTitle, {
    x: pageWidth - boldFont.widthOfTextAtSize(invoiceTitle, titleSize) - marginLeft,
    y: 841.89 - headerHeight + 55,
    size: titleSize,
    font: boldFont,
    color: white
  })

  // Invoice meta
  const today = new Date(data.issueDate).toLocaleDateString()
  page.drawText(`No: ${data.invoiceNumber}`, {
    x: pageWidth - boldFont.widthOfTextAtSize(`No: ${data.invoiceNumber}`, 10) - marginLeft,
    y: 841.89 - headerHeight + 18,
    size: 10,
    font: boldFont,
    color: rgb(0.75, 0.75, 0.75)
  })
  page.drawText(`Date: ${today}`, {
    x: pageWidth - regularFont.widthOfTextAtSize(`Date: ${today}`, 10) - marginLeft,
    y: 841.89 - headerHeight + 6,
    size: 10,
    font: regularFont,
    color: rgb(0.75, 0.75, 0.75)
  })

  // --- BODY ---
  let y = 841.89 - headerHeight - sectionGap

  // Two-column layout
  const colWidth = (contentWidth - 40) / 2
  const leftColX = marginLeft
  const rightColX = marginLeft + colWidth + 40

  const sectionTitleSize = 12
  const labelSize = 10
  const valueSize = 10

  // LEFT COLUMN: Client & Trademark Details
  page.drawText('Client & Trademark Details', { x: leftColX, y, size: sectionTitleSize, font: boldFont, color: navy })
  y -= 25

  const clientRows: Array<[string, string]> = [
    ['Client Name', data.clientName || 'Client'],
    ['Trademark', data.trademark || '—']
  ]
  clientRows.forEach(([label, value]) => {
    page.drawText(label, { x: leftColX, y, size: labelSize, font: boldFont, color: darkGray })
    page.drawText(value, { x: leftColX + 110, y, size: valueSize, font: regularFont, color: mediumGray })
    y -= 20
  })

  // RIGHT COLUMN: Billing Schedule
  let yRight = 841.89 - headerHeight - sectionGap
  page.drawText('Billing Schedule', { x: rightColX, y: yRight, size: sectionTitleSize, font: boldFont, color: navy })
  yRight -= 25

  const billingRows: Array<[string, string]> = [
    ['Issue Date', today],
    ['Due Date', data.dueDate ? new Date(data.dueDate).toLocaleDateString() : '—'],
    ['Payment Method', data.method || 'Bank Transfer']
  ]
  billingRows.forEach(([label, value]) => {
    page.drawText(label, { x: rightColX, y: yRight, size: labelSize, font: boldFont, color: darkGray })
    page.drawText(value, { x: rightColX + 110, y: yRight, size: valueSize, font: regularFont, color: mediumGray })
    yRight -= 20
  })

  y = Math.min(y, yRight) - sectionGap

  // --- FEE DETAILS TABLE ---
  page.drawText('Fee Details', { x: marginLeft, y, size: sectionTitleSize, font: boldFont, color: navy })
  y -= 28

  page.drawRectangle({ x: marginLeft, y: y - 7, width: contentWidth, height: 26, color: rgb(0.98, 0.98, 0.98) })
  page.drawLine({ start: { x: marginLeft, y }, end: { x: marginRight, y }, thickness: 0.5, color: subtleLine })
  page.drawText('#', { x: marginLeft + 10, y, size: 10, font: boldFont, color: navy })
  page.drawText('Description', { x: marginLeft + 40, y, size: 10, font: boldFont, color: navy })
  page.drawText('Amount', { x: marginRight - 80, y, size: 10, font: boldFont, color: navy })
  y -= 30

  const tableRowHeight = 28
  data.items.forEach((item, index) => {
    if (index % 2 === 0) {
      page.drawRectangle({ x: marginLeft, y: y - 7, width: contentWidth, height: tableRowHeight, color: rgb(0.99, 0.99, 0.99) })
    }
    page.drawText(String(index + 1), { x: marginLeft + 10, y, size: 9.5, font: regularFont, color: darkGray })
    page.drawText(item.description, { x: marginLeft + 40, y, size: 9.5, font: regularFont, color: darkGray })
    const amountText = `${data.currency || 'ETB'} ${Number(item.amount || 0).toLocaleString()}`
    page.drawText(amountText, { x: marginRight - 80, y, size: 9.5, font: regularFont, color: darkGray })
    y -= tableRowHeight
  })

  page.drawLine({ start: { x: marginLeft, y }, end: { x: marginRight, y }, thickness: 0.5, color: subtleLine })
  y -= 25

  // Notes section
  if (data.notes && !data.notes.includes('Auto-generated for')) {
    y -= 20
    page.drawText('NOTES', { x: marginLeft, y, size: 10, font: boldFont, color: rgb(0.4, 0.4, 0.4) })
    y -= 20
    const notesLines = data.notes.split('\n')
    notesLines.forEach(line => {
      if (line.trim()) {
        page.drawText(line, { x: marginLeft, y, size: 10, font: regularFont, color: rgb(0.3, 0.3, 0.3) })
        y -= 16
      }
    })
    y -= 15
  }

  // --- TOTAL AMOUNT DUE ---
  y -= 10
  page.drawLine({ start: { x: marginRight - 220, y }, end: { x: marginRight, y }, thickness: 1.5, color: navy })
  y -= 20

  page.drawText('Total Amount Due', { x: marginRight - 210, y, size: 11, font: boldFont, color: mediumGray })
  const totalAmount = `${data.currency || 'ETB'} ${Number(data.amount || 0).toLocaleString()}`
  const totalWidth = boldFont.widthOfTextAtSize(totalAmount, 18)
  page.drawText(totalAmount, { x: marginRight - totalWidth, y: y - 18, size: 18, font: boldFont, color: navy })
  y -= 50

  // --- SIGNATURE ---
  y -= 30
  page.drawLine({ start: { x: marginRight - 180, y }, end: { x: marginRight, y }, thickness: 0.75, color: subtleLine })
  y -= 14
  page.drawText('Authorized Signature', { x: marginRight - 175, y, size: 10, font: regularFont, color: mediumGray })

  // --- FOOTER ---
  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: 35, color: navy })
  const footerText = `${data.companyInfo.companyName || 'EAST AFRICAN INTELLECTUAL PROPERTY'} | ${data.companyInfo.companyEmail || 'info@eastafricanip.com'}`
  const footerWidth = regularFont.widthOfTextAtSize(footerText, 8.5)
  page.drawText(footerText, { x: (pageWidth - footerWidth) / 2, y: 13, size: 8.5, font: regularFont, color: rgb(0.8, 0.8, 0.8) })

  return await pdfDoc.save()
}
