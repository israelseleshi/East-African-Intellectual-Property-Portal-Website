import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
}

export interface UseExcelExportOptions<T> {
  sheetName: string
  fileName: string
  columns: ExcelColumn[]
  rows: T[]
  mapRow: (item: T, index: number) => Record<string, unknown>
  formatHeader?: (worksheet: unknown) => void
  formatRow?: (row: unknown, item: T, index: number) => void | Promise<void>
  successMessage?: string
  errorMessage?: string
}

export function useExcelExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const startExport = useCallback(async <T>(opts: UseExcelExportOptions<T>) => {
    const { sheetName, fileName, columns, rows, mapRow, formatHeader, formatRow, successMessage, errorMessage } = opts

    if (rows.length === 0) {
      toast.error('No data to export')
      return
    }

    setIsExporting(true)
    setExportProgress(5)

    try {
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'EAIP Portal'
      workbook.created = new Date()
      ;(workbook.properties as unknown as Record<string, unknown>).defaultFont = { name: 'DengXian', size: 11 }

      const valueLengths: number[] = columns.map(c => c.header.length)
      for (let i = 0; i < rows.length; i++) {
        const mapped = mapRow(rows[i], i)
        columns.forEach((c, ci) => {
          const val = mapped[c.key]
          if (val != null) {
            const s = String(val)
            let cjkCount = 0
            for (const ch of s) if (ch > '\u00FF') cjkCount++
            const len = s.length + cjkCount
            if (len > valueLengths[ci]) valueLengths[ci] = len
          }
        })
      }

      const worksheet = workbook.addWorksheet(sheetName)

      columns.forEach((c, i) => {
        const col = worksheet.getColumn(i + 1)
        col.width = c.width ?? Math.min(Math.max(valueLengths[i] + 3, 10), 50)
        col.key = c.key
      })

      const borderStyle = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }

      worksheet.addRow(columns.reduce((acc, c) => { acc[c.key] = c.header; return acc }, {} as Record<string, string>))

      if (formatHeader) {
        formatHeader(worksheet)
      } else {
        const headerRow = worksheet.getRow(1)
        headerRow.height = 25
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
        for (let i = 1; i <= columns.length; i++) {
          const cell = headerRow.getCell(i)
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
          cell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
        }
        worksheet.views = [{ state: 'frozen', ySplit: 1 }]
        worksheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: columns.length },
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const rowData = mapRow(rows[i], i)
        const row = worksheet.addRow(rowData)

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
          cell.alignment = { vertical: 'middle', horizontal: 'left' }
        })

        if (formatRow) {
          await formatRow(row, rows[i], i)
        }

        setExportProgress(Math.round(((i + 1) / rows.length) * 90) + 5)
      }

      setExportProgress(97)

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportProgress(100)
      toast.success(successMessage || 'Excel file has been downloaded.')
    } catch (err) {
      console.error('Export error:', err)
      toast.error(errorMessage || 'Could not generate Excel file.')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }, [])

  return { isExporting, exportProgress, startExport }
}
