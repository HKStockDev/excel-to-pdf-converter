import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export type SheetPreview = {
  name: string
  rowCount: number
  columnCount: number
}

export type WorkbookPreview = {
  fileName: string
  sheets: SheetPreview[]
}

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv']
const MAX_FILE_SIZE_MB = 10

export function validateExcelFile(file: File): string | null {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return 'Please upload an Excel file (.xlsx, .xls) or CSV.'
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`
  }

  return null
}

function sheetToRows(sheet: XLSX.WorkSheet): string[][] {
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    sheet,
    { header: 1, defval: '' },
  )

  return rows.map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? '' : String(cell))),
  )
}

export async function previewWorkbook(file: File): Promise<WorkbookPreview> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name]
    const rows = sheetToRows(sheet)
    const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0)

    return {
      name,
      rowCount: rows.length,
      columnCount,
    }
  })

  return {
    fileName: file.name,
    sheets,
  }
}

export async function convertExcelToPdf(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

  workbook.SheetNames.forEach((sheetName, index) => {
    if (index > 0) {
      pdf.addPage()
    }

    const rows = sheetToRows(workbook.Sheets[sheetName])
    if (rows.length === 0) {
      pdf.setFontSize(14)
      pdf.text(`Sheet "${sheetName}" is empty.`, 40, 60)
      return
    }

    const [headerRow, ...bodyRows] = rows
    const head = [headerRow]
    const body = bodyRows.length > 0 ? bodyRows : [headerRow.map(() => '')]

    pdf.setFontSize(12)
    pdf.text(sheetName, 40, 30)

    autoTable(pdf, {
      startY: 45,
      head,
      body,
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 40, right: 40 },
    })
  })

  return pdf.output('blob')
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function pdfFileNameFromExcel(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '')
  return `${baseName}.pdf`
}
