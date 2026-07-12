export type ProgressPhase = 'upload' | 'convert' | 'download'

export type ProgressCallback = (
  progress: number,
  phase: ProgressPhase,
) => void

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
