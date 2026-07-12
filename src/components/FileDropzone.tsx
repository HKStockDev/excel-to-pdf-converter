import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'

type FileDropzoneProps = {
  onFilesSelect: (files: File[]) => void
  disabled?: boolean
  fileCount?: number
}

export function FileDropzone({
  onFilesSelect,
  disabled = false,
  fileCount = 0,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }
    onFilesSelect(Array.from(files))
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (!disabled) {
      handleFiles(event.dataTransfer.files)
    }
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files)
    event.target.value = ''
  }

  return (
    <div
      className={`dropzone${isDragging ? ' dropzone--active' : ''}${disabled ? ' dropzone--disabled' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) {
          setIsDragging(true)
        }
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (!disabled) {
            inputRef.current?.click()
          }
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        multiple
        hidden
        disabled={disabled}
        onChange={onInputChange}
      />

      <div className="dropzone__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M12 16V4m0 0L8 8m4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="dropzone__title">
        {fileCount > 0 ? 'Add more Excel files' : 'Drop your Excel files here'}
      </p>
      <p className="dropzone__hint">
        or click to browse · multiple files supported (.xlsx, .xls, .csv)
      </p>
      {fileCount > 0 && (
        <p className="dropzone__count">{fileCount} file{fileCount !== 1 ? 's' : ''} in queue</p>
      )}
    </div>
  )
}
