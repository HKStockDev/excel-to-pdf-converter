import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import {
  delay,
  runProgressSteps,
  type ProgressCallback,
  type ProgressPhase,
} from './progress'

export type { ProgressCallback, ProgressPhase }

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
const PDF_FONT = 'times'

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

export async function readFileWithProgress(
  file: File,
  onProgress: ProgressCallback,
): Promise<ArrayBuffer> {
  onProgress(0, 'upload')
  await runProgressSteps([20, 45, 65, 85], 'upload', onProgress)
  const buffer = await file.arrayBuffer()
  onProgress(100, 'upload')
  return buffer
}

export function previewWorkbookFromBuffer(
  buffer: ArrayBuffer,
  fileName: string,
): WorkbookPreview {
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

  return { fileName, sheets }
}

export async function previewWorkbook(
  file: File,
  onProgress?: ProgressCallback,
): Promise<WorkbookPreview> {
  const buffer = onProgress
    ? await readFileWithProgress(file, onProgress)
    : await file.arrayBuffer()

  return previewWorkbookFromBuffer(buffer, file.name)
}

export async function convertBufferToPdf(
  buffer: ArrayBuffer,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const sheetNames = workbook.SheetNames
  const totalSheets = Math.max(sheetNames.length, 1)

  sheetNames.forEach((sheetName, index) => {
    if (index > 0) {
      pdf.addPage()
    }

    const rows = sheetToRows(workbook.Sheets[sheetName])
    pdf.setFont(PDF_FONT, 'normal')

    if (rows.length === 0) {
      pdf.setFontSize(14)
      pdf.text(`Sheet "${sheetName}" is empty.`, 40, 60)
    } else {
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
          font: PDF_FONT,
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
          textColor: [26, 35, 50],
        },
        headStyles: {
          font: PDF_FONT,
          fontStyle: 'bold',
          fillColor: [15, 39, 68],
          textColor: 255,
        },
        alternateRowStyles: {
          fillColor: [244, 246, 248],
        },
        margin: { left: 40, right: 40 },
      })
    }

    onProgress?.(Math.round(((index + 1) / totalSheets) * 100))
  })

  return pdf.output('blob')
}

export async function convertExcelToPdf(
  file: File,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  onProgress?.(0, 'convert')

  const buffer = await file.arrayBuffer()
  const blob = await convertBufferToPdf(buffer, (sheetProgress) => {
    onProgress?.(sheetProgress, 'convert')
  })

  onProgress?.(100, 'convert')
  return blob
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function downloadBlobWithProgress(
  blob: Blob,
  fileName: string,
  onProgress: ProgressCallback,
): Promise<void> {
  onProgress(0, 'download')
  await runProgressSteps([30, 60, 85], 'download', onProgress, 60)
  downloadBlob(blob, fileName)
  onProgress(100, 'download')
}

export async function downloadAllPdfs(
  files: { name: string; blob: Blob }[],
  onProgress?: ProgressCallback,
): Promise<void> {
  if (files.length === 0) {
    return
  }

  if (files.length === 1) {
    await downloadBlobWithProgress(files[0].blob, files[0].name, (progress, phase) => {
      onProgress?.(progress, phase)
    })
    return
  }

  onProgress?.(0, 'download')

  const zip = new JSZip()
  files.forEach(({ name, blob }) => {
    zip.file(name, blob)
  })

  onProgress?.(45, 'download')
  const zipBlob = await zip.generateAsync(
    { type: 'blob' },
    (metadata) => {
      onProgress?.(45 + Math.round(metadata.percent * 0.45), 'download')
    },
  )

  onProgress?.(95, 'download')
  downloadBlob(zipBlob, 'converted-pdfs.zip')
  await delay(120)
  onProgress?.(100, 'download')
}

export function pdfFileNameFromExcel(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '')
  return `${baseName}.pdf`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
