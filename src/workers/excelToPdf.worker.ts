/// <reference lib="webworker" />

import {
  convertBufferToPdfCore,
  type PdfLayoutOptions,
} from '../utils/convertCore'

export type WorkerRequest = {
  buffer: ArrayBuffer
  layout: PdfLayoutOptions
}

export type WorkerResponse =
  | { type: 'progress'; progress: number }
  | { type: 'complete'; pdfBuffer: ArrayBuffer }
  | { type: 'error'; message: string }

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { buffer, layout } = event.data

  try {
    const pdfBuffer = await convertBufferToPdfCore(buffer, layout, (progress) => {
      const message: WorkerResponse = { type: 'progress', progress }
      self.postMessage(message)
    })

    const complete: WorkerResponse = { type: 'complete', pdfBuffer }
    self.postMessage(complete, [pdfBuffer])
  } catch (error) {
    const message: WorkerResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Conversion failed',
    }
    self.postMessage(message)
  }
}
