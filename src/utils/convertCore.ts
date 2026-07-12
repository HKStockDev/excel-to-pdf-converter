import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export type PdfLayoutOptions = {
  headerText: string
  footerText: string
}

export type ConvertProgressCallback = (progress: number) => void

const PDF_FONT = 'helvetica'
const PAGE_MARGIN = { top: 58, bottom: 48, left: 40, right: 40 }
const HEADER_Y = 28
const FOOTER_Y_OFFSET = 28

function sheetToRows(sheet: XLSX.WorkSheet): string[][] {
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    sheet,
    { header: 1, defval: '' },
  )

  return rows.map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? '' : String(cell))),
  )
}

function drawPageHeaderFooter(
  pdf: jsPDF,
  pageNumber: number,
  totalPages: number,
  layout: PdfLayoutOptions,
): void {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const footerY = pageHeight - FOOTER_Y_OFFSET

  pdf.setFont(PDF_FONT, 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(15, 23, 42)

  if (layout.headerText.trim()) {
    pdf.text(layout.headerText.trim(), pageWidth / 2, HEADER_Y, { align: 'center' })
  }

  pdf.setDrawColor(213, 221, 230)
  pdf.setLineWidth(0.5)
  pdf.line(PAGE_MARGIN.left, 38, pageWidth - PAGE_MARGIN.right, 38)

  pdf.setTextColor(107, 124, 144)

  if (layout.footerText.trim()) {
    pdf.text(layout.footerText.trim(), PAGE_MARGIN.left, footerY)
  }

  pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - PAGE_MARGIN.right, footerY, {
    align: 'right',
  })
}

function applyPageNumbersAndFooters(pdf: jsPDF, layout: PdfLayoutOptions): void {
  const totalPages = pdf.getNumberOfPages()

  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page)
    drawPageHeaderFooter(pdf, page, totalPages, layout)
  }
}

function sheetProgress(index: number, totalSheets: number): number {
  return 10 + Math.round(((index + 1) / totalSheets) * 75)
}

export async function convertBufferToPdfCore(
  buffer: ArrayBuffer,
  layout: PdfLayoutOptions = { headerText: '', footerText: '' },
  onProgress?: ConvertProgressCallback,
  yieldStep: () => Promise<void> = async () => {},
): Promise<ArrayBuffer> {
  onProgress?.(2)
  await yieldStep()

  onProgress?.(5)
  const workbook = XLSX.read(buffer, { type: 'array' })
  onProgress?.(10)
  await yieldStep()

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const sheetNames = workbook.SheetNames
  const totalSheets = Math.max(sheetNames.length, 1)
  const hasHeader = layout.headerText.trim().length > 0

  for (let index = 0; index < sheetNames.length; index += 1) {
    const sheetName = sheetNames[index]

    if (index > 0) {
      pdf.addPage()
    }

    const rows = sheetToRows(workbook.Sheets[sheetName])
    pdf.setFont(PDF_FONT, 'normal')

    if (rows.length === 0) {
      pdf.setFontSize(14)
      pdf.setTextColor(26, 35, 50)
      pdf.text(`Sheet "${sheetName}" is empty.`, PAGE_MARGIN.left, PAGE_MARGIN.top + 10)
    } else {
      const [headerRow, ...bodyRows] = rows
      const head = [headerRow]
      const body = bodyRows.length > 0 ? bodyRows : [headerRow.map(() => '')]

      pdf.setFontSize(12)
      pdf.setTextColor(15, 23, 42)
      pdf.text(sheetName, PAGE_MARGIN.left, hasHeader ? PAGE_MARGIN.top - 6 : 30)

      autoTable(pdf, {
        startY: hasHeader ? PAGE_MARGIN.top + 4 : 45,
        head,
        body,
        styles: {
          font: PDF_FONT,
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
          textColor: [26, 35, 50],
        },
        headStyles: {
          font: PDF_FONT,
          fontStyle: 'bold',
          fillColor: [15, 23, 42],
          textColor: 255,
        },
        alternateRowStyles: {
          fillColor: [255, 247, 237],
        },
        margin: PAGE_MARGIN,
      })
    }

    onProgress?.(sheetProgress(index, totalSheets))
    await yieldStep()
  }

  onProgress?.(88)
  await yieldStep()

  applyPageNumbersAndFooters(pdf, layout)

  onProgress?.(93)
  await yieldStep()

  const pdfBuffer = pdf.output('arraybuffer') as ArrayBuffer

  onProgress?.(100)
  return pdfBuffer
}
