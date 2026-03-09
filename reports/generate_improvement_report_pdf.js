const fs = require('fs')
const path = require('path')
const { PDFDocument, StandardFonts, rgb } = require('../client/node_modules/pdf-lib')

async function main() {
  const mdPath = path.join(__dirname, 'TPMS_Improvement_Areas_2026-03-09.md')
  const pdfPath = path.join(__dirname, 'TPMS_Improvement_Areas_2026-03-09.pdf')

  const markdown = fs.readFileSync(mdPath, 'utf8')
  const lines = markdown.split(/\r?\n/)

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageSize = { width: 595, height: 842 } // A4
  const margin = 50
  const lineHeight = 14
  const maxWidth = pageSize.width - margin * 2

  let page = pdfDoc.addPage([pageSize.width, pageSize.height])
  let y = pageSize.height - margin

  const wrap = (text, size) => {
    const words = text.split(' ')
    const wrapped = []
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      const width = font.widthOfTextAtSize(candidate, size)
      if (width <= maxWidth) {
        current = candidate
      } else {
        if (current) wrapped.push(current)
        current = word
      }
    }
    if (current) wrapped.push(current)
    return wrapped
  }

  const newPageIfNeeded = () => {
    if (y < margin + 20) {
      page = pdfDoc.addPage([pageSize.width, pageSize.height])
      y = pageSize.height - margin
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line) {
      y -= lineHeight / 2
      newPageIfNeeded()
      continue
    }

    let size = 11
    let activeFont = font
    let color = rgb(0.1, 0.1, 0.1)
    let text = line

    if (line.startsWith('# ')) {
      size = 18
      activeFont = bold
      color = rgb(0.0, 0.25, 0.45)
      text = line.replace(/^#\s+/, '')
    } else if (line.startsWith('## ')) {
      size = 14
      activeFont = bold
      color = rgb(0.0, 0.25, 0.45)
      text = line.replace(/^##\s+/, '')
    } else if (line.startsWith('1. ') || line.startsWith('- ')) {
      size = 11
      activeFont = font
    } else if (line.startsWith('Date:') || line.startsWith('Scope:')) {
      size = 10
      color = rgb(0.3, 0.3, 0.3)
    }

    const wrapped = wrap(text, size)
    for (const w of wrapped) {
      newPageIfNeeded()
      page.drawText(w, { x: margin, y, size, font: activeFont, color })
      y -= lineHeight + (size >= 14 ? 2 : 0)
    }
  }

  const pdfBytes = await pdfDoc.save()
  fs.writeFileSync(pdfPath, pdfBytes)
  console.log(pdfPath)
}

main().catch((e) => {
  console.error('Failed to generate report PDF:', e)
  process.exit(1)
})
