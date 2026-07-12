import { phaseLabel, type ProgressPhase } from '../utils/progress'

type ProgressBarProps = {
  progress: number
  phase: ProgressPhase | null
  visible?: boolean
  size?: 'sm' | 'md'
}

export function ProgressBar({
  progress,
  phase,
  visible = true,
  size = 'md',
}: ProgressBarProps) {
  if (!visible) {
    return null
  }

  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className={`progress progress--${size}`} role="progressbar" aria-valuenow={clampedProgress} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress__header">
        <span className="progress__label">{phaseLabel(phase)}</span>
        <span className="progress__value">{clampedProgress}%</span>
      </div>
      <div className="progress__track">
        <div
          className={`progress__fill progress__fill--${phase ?? 'idle'}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}
