import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import {
  convertBufferToPdfCore,
  type PdfLayoutOptions,
} from './convertCore'
import { convertBufferWithWorker } from './convertWorkerClient'
import {
  createThrottledProgressReporter,
  delay,
  runProgressSteps,
  yieldToMain,
  type ProgressCallback,
  type ProgressPhase,
} from './progress'

export type { ProgressCallback, ProgressPhase, PdfLayoutOptions }

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
/** Files above this threshold convert in a Web Worker to keep the UI responsive. */
export const LARGE_FILE_BYTES = 512 * 1024

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
  layout: PdfLayoutOptions = { headerText: '', footerText: '' },
): Promise<Blob> {
  const pdfBuffer = await convertBufferToPdfCore(
    buffer,
    layout,
    onProgress,
    yieldToMain,
  )

  return new Blob([pdfBuffer], { type: 'application/pdf' })
}

export async function convertExcelToPdf(
  file: File,
  onProgress?: ProgressCallback,
  layout: PdfLayoutOptions = { headerText: '', footerText: '' },
): Promise<Blob> {
  onProgress?.(0, 'convert')

  const buffer = await file.arrayBuffer()
  onProgress?.(3, 'convert')

  if (file.size > LARGE_FILE_BYTES) {
    return convertBufferWithWorker(buffer, layout, onProgress)
  }

  const reporter = onProgress
    ? createThrottledProgressReporter(onProgress, 'convert')
    : null

  const blob = await convertBufferToPdf(buffer, (progress) => {
    reporter?.report(progress)
  }, layout)

  reporter?.flush(100)
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
