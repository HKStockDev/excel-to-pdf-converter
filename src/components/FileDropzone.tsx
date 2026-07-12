import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'

type FileDropzoneProps = {
  onFileSelect: (file: File) => void
  disabled?: boolean
  selectedFileName?: string | null
}

export function FileDropzone({
  onFileSelect,
  disabled = false,
  selectedFileName,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) {
      onFileSelect(file)
    }
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
        {selectedFileName ? 'Replace Excel file' : 'Drop your Excel file here'}
      </p>
      <p className="dropzone__hint">
        {selectedFileName ?? 'or click to browse (.xlsx, .xls, .csv)'}
      </p>
    </div>
  )
}
