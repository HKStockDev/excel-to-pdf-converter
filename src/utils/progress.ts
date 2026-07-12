export type ProgressPhase = 'upload' | 'convert' | 'download'

export type ProgressCallback = (
  progress: number,
  phase: ProgressPhase,
) => void

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
      return
    }

    setTimeout(resolve, 0)
  })
}

export type ThrottledProgressReporter = {
  report: (progress: number) => void
  flush: (progress?: number) => void
}

export function createThrottledProgressReporter(
  onProgress: ProgressCallback,
  phase: ProgressPhase,
): ThrottledProgressReporter {
  let lastReported = -1
  let pending: number | null = null
  let rafId: number | null = null

  const emit = (progress: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(progress)))
    if (clamped <= lastReported) {
      return
    }

    lastReported = clamped
    onProgress(clamped, phase)
  }

  const flush = (progress?: number) => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    if (progress !== undefined) {
      emit(progress)
      pending = null
      return
    }

    if (pending !== null) {
      emit(pending)
      pending = null
    }
  }

  const report = (progress: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(progress)))
    if (clamped <= lastReported) {
      return
    }

    pending = clamped

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null
        if (pending !== null) {
          emit(pending)
          pending = null
        }
      })
    }
  }

  return { report, flush }
}

export async function runProgressSteps(
  steps: number[],
  phase: ProgressPhase,
  onProgress: ProgressCallback,
  stepDelayMs = 40,
): Promise<void> {
  for (const step of steps) {
    onProgress(step, phase)
    await delay(stepDelayMs)
  }
}

export function phaseLabel(phase: ProgressPhase | null): string {
  switch (phase) {
    case 'upload':
      return 'Uploading'
    case 'convert':
      return 'Converting'
    case 'download':
      return 'Downloading'
    default:
      return 'Ready'
  }
}
