import type { PdfLayoutOptions } from './convertCore'
import type { WorkerResponse } from '../workers/excelToPdf.worker'
import {
  createThrottledProgressReporter,
  type ProgressCallback,
} from './progress'

export function convertBufferWithWorker(
  buffer: ArrayBuffer,
  layout: PdfLayoutOptions,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/excelToPdf.worker.ts', import.meta.url),
      { type: 'module' },
    )

    const reporter = onProgress
      ? createThrottledProgressReporter(onProgress, 'convert')
      : null

    const cleanup = () => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      worker.terminate()
    }

    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data

      if (data.type === 'progress') {
        reporter?.report(data.progress)
        return
      }

      cleanup()

      if (data.type === 'complete') {
        reporter?.flush(100)
        resolve(new Blob([data.pdfBuffer], { type: 'application/pdf' }))
        return
      }

      reporter?.flush(0)
      reject(new Error(data.message))
    }

    const handleError = () => {
      cleanup()
      reporter?.flush(0)
      reject(new Error('Worker conversion failed'))
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)
    worker.postMessage({ buffer, layout }, [buffer])
  })
}
