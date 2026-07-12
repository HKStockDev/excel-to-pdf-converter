import { ProgressBar } from './ProgressBar'
import type { ProgressPhase } from '../utils/progress'
import type { WorkbookPreview } from '../utils/excelToPdf'
import { formatFileSize } from '../utils/excelToPdf'

export type FileJobStatus =
  | 'pending'
  | 'uploading'
  | 'ready'
  | 'converting'
  | 'converted'
  | 'downloading'
  | 'done'
  | 'error'

export type FileJob = {
  id: string
  file: File
  status: FileJobStatus
  progress: number
  phase: ProgressPhase | null
  preview: WorkbookPreview | null
  pdfBlob: Blob | null
  pdfName: string | null
  error: string | null
}

type FileJobCardProps = {
  job: FileJob
  onConvert: (id: string) => void
  onDownload: (id: string) => void
  onRemove: (id: string) => void
  disabled?: boolean
}

function statusLabel(status: FileJobStatus): string {
  switch (status) {
    case 'pending':
      return 'Queued'
    case 'uploading':
      return 'Uploading'
    case 'ready':
      return 'Ready'
    case 'converting':
      return 'Converting'
    case 'converted':
      return 'Converted'
    case 'downloading':
      return 'Downloading'
    case 'done':
      return 'Complete'
    case 'error':
      return 'Failed'
  }
}

export function FileJobCard({
  job,
  onConvert,
  onDownload,
  onRemove,
  disabled = false,
}: FileJobCardProps) {
  const isBusy = ['uploading', 'converting', 'downloading'].includes(job.status)
  const showProgress = isBusy || (job.progress > 0 && job.progress < 100)

  return (
    <tr className={`file-table__row file-table__row--${job.status}`}>
      <td className="file-table__cell file-table__cell--file">
        <span className="file-table__name">{job.file.name}</span>
        <span className="file-table__meta">
          {formatFileSize(job.file.size)}
          {job.preview && (
            <>
              {' · '}
              {job.preview.sheets.length} sheet{job.preview.sheets.length !== 1 ? 's' : ''}
            </>
          )}
        </span>
        {job.error && <span className="file-table__error">{job.error}</span>}
      </td>

      <td className="file-table__cell file-table__cell--sheets">
        {job.preview && job.preview.sheets.length > 0 ? (
          <ul className="file-table__sheets">
            {job.preview.sheets.map((sheet) => (
              <li key={sheet.name}>
                <span className="file-table__sheet-name">{sheet.name}</span>
                <span className="file-table__sheet-meta">
                  {sheet.rowCount} rows · {sheet.columnCount} cols
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="file-table__placeholder">—</span>
        )}
      </td>

      <td className="file-table__cell file-table__cell--status">
        <span className={`file-table__badge file-table__badge--${job.status}`}>
          {statusLabel(job.status)}
        </span>
        <ProgressBar progress={job.progress} phase={job.phase} visible={showProgress} size="sm" />
      </td>

      <td className="file-table__cell file-table__cell--actions">
        <div className="file-table__actions">
          <button
            type="button"
            className="button button--primary button--sm"
            onClick={() => onConvert(job.id)}
            disabled={disabled || isBusy || job.status === 'converting'}
          >
            Convert
          </button>
          <button
            type="button"
            className="button button--secondary button--sm"
            onClick={() => onDownload(job.id)}
            disabled={disabled || isBusy || !job.pdfBlob}
          >
            Download PDF
          </button>
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={() => onRemove(job.id)}
            disabled={disabled || isBusy}
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  )
}
