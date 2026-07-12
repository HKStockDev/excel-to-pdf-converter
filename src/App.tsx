import { useCallback, useMemo, useState } from 'react'
import { FileDropzone } from './components/FileDropzone'
import { FileJobCard, type FileJob } from './components/FileJobCard'
import { PdfSettings } from './components/PdfSettings'
import { ProgressBar } from './components/ProgressBar'
import {
  convertExcelToPdf,
  downloadAllPdfs,
  downloadBlobWithProgress,
  pdfFileNameFromExcel,
  previewWorkbook,
  validateExcelFile,
  type PdfLayoutOptions,
} from './utils/excelToPdf'
import type { ProgressPhase } from './utils/progress'
import './App.css'

function createJobId(): string {
  return crypto.randomUUID()
}

function App() {
  const [jobs, setJobs] = useState<FileJob[]>([])
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchPhase, setBatchPhase] = useState<ProgressPhase | null>(null)
  const [batchActive, setBatchActive] = useState(false)
  const [globalMessage, setGlobalMessage] = useState<string | null>(null)
  const [headerText, setHeaderText] = useState('')
  const [footerText, setFooterText] = useState('')

  const pdfLayout = useMemo<PdfLayoutOptions>(
    () => ({ headerText, footerText }),
    [headerText, footerText],
  )

  const isBusy = useMemo(
    () =>
      batchActive ||
      jobs.some((job) =>
        ['uploading', 'converting', 'downloading'].includes(job.status),
      ),
    [batchActive, jobs],
  )

  const updateJob = useCallback((id: string, patch: Partial<FileJob>) => {
    setJobs((current) =>
      current.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    )
  }, [])

  const handleFilesSelect = async (files: File[]) => {
    setGlobalMessage(null)

    for (const file of files) {
      const id = createJobId()
      const validationError = validateExcelFile(file)

      if (validationError) {
        setJobs((current) => [
          ...current,
          {
            id,
            file,
            status: 'error',
            progress: 0,
            phase: null,
            preview: null,
            pdfBlob: null,
            pdfName: null,
            error: validationError,
          },
        ])
        continue
      }

      setJobs((current) => [
        ...current,
        {
          id,
          file,
          status: 'uploading',
          progress: 0,
          phase: 'upload',
          preview: null,
          pdfBlob: null,
          pdfName: null,
          error: null,
        },
      ])

      try {
        const preview = await previewWorkbook(file, (progress, phase) => {
          updateJob(id, { progress, phase, status: 'uploading' })
        })

        updateJob(id, {
          status: 'ready',
          progress: 100,
          phase: null,
          preview,
        })
      } catch {
        updateJob(id, {
          status: 'error',
          progress: 0,
          phase: null,
          error: 'Unable to read this file. Please upload a valid Excel workbook.',
        })
      }
    }
  }

  const convertJob = useCallback(async (job: FileJob) => {
    updateJob(job.id, { status: 'converting', progress: 0, phase: 'convert', error: null })

    try {
      const pdfBlob = await convertExcelToPdf(job.file, (progress, phase) => {
        updateJob(job.id, { progress, phase })
      }, pdfLayout)

      updateJob(job.id, {
        status: 'converted',
        progress: 100,
        phase: null,
        pdfBlob,
        pdfName: pdfFileNameFromExcel(job.file.name),
      })
    } catch {
      updateJob(job.id, {
        status: 'error',
        progress: 0,
        phase: null,
        error: 'Conversion failed. Please try again.',
      })
    }
  }, [updateJob, pdfLayout])

  const handleConvert = async (id: string) => {
    const job = jobs.find((item) => item.id === id)
    if (!job || job.status === 'converting') {
      return
    }

    setGlobalMessage(null)
    await convertJob(job)
  }

  const downloadJob = useCallback(async (job: FileJob) => {
    if (!job.pdfBlob || !job.pdfName) {
      return
    }

    updateJob(job.id, { status: 'downloading', progress: 0, phase: 'download' })

    try {
      await downloadBlobWithProgress(job.pdfBlob, job.pdfName, (progress, phase) => {
        updateJob(job.id, { progress, phase })
      })

      updateJob(job.id, { status: 'done', progress: 100, phase: null })
    } catch {
      updateJob(job.id, {
        status: 'error',
        progress: 0,
        phase: null,
        error: 'Download failed. Please try again.',
      })
    }
  }, [updateJob])

  const handleDownload = async (id: string) => {
    const job = jobs.find((item) => item.id === id)
    if (!job) {
      return
    }

    setGlobalMessage(null)
    await downloadJob(job)
  }

  const handleRemove = (id: string) => {
    setJobs((current) => current.filter((job) => job.id !== id))
  }

  const handleConvertAll = async () => {
    const readyJobs = jobs.filter((job) =>
      ['ready', 'converted', 'done'].includes(job.status),
    )

    if (readyJobs.length === 0) {
      return
    }

    setBatchActive(true)
    setBatchProgress(0)
    setBatchPhase('convert')
    setGlobalMessage(null)

    for (let index = 0; index < readyJobs.length; index += 1) {
      await convertJob(readyJobs[index])
      setBatchProgress(Math.round(((index + 1) / readyJobs.length) * 100))
    }

    setBatchPhase(null)
    setBatchActive(false)
    setGlobalMessage(`Converted ${readyJobs.length} file${readyJobs.length !== 1 ? 's' : ''}.`)
  }

  const handleDownloadAll = async () => {
    const convertedJobs = jobs.filter((job) => job.pdfBlob && job.pdfName)

    if (convertedJobs.length === 0) {
      return
    }

    setBatchActive(true)
    setBatchProgress(0)
    setBatchPhase('download')
    setGlobalMessage(null)

    try {
      await downloadAllPdfs(
        convertedJobs.map((job) => ({
          name: job.pdfName!,
          blob: job.pdfBlob!,
        })),
        (progress, phase) => {
          setBatchProgress(progress)
          setBatchPhase(phase)
        },
      )

      convertedJobs.forEach((job) => {
        updateJob(job.id, { status: 'done', progress: 100, phase: null })
      })

      const label =
        convertedJobs.length === 1
          ? 'PDF downloaded successfully.'
          : `${convertedJobs.length} PDFs downloaded as ZIP.`

      setGlobalMessage(label)
    } catch {
      setGlobalMessage('Batch download failed. Please try individual downloads.')
    } finally {
      setBatchPhase(null)
      setBatchActive(false)
      setBatchProgress(100)
    }
  }

  const handleClearAll = () => {
    setJobs([])
    setGlobalMessage(null)
    setBatchProgress(0)
    setBatchPhase(null)
  }

  const readyCount = jobs.filter((job) => job.status === 'ready').length
  const convertedCount = jobs.filter((job) => job.pdfBlob).length

  return (
    <div className="app">
      <header className="app__header">
        <p className="app__eyebrow">Document Conversion Suite</p>
        <h1>Excel to PDF Converter</h1>
        <p className="app__subtitle">
          Upload one or multiple spreadsheets, track progress at every step, and download
          polished PDF documents formatted in Times New Roman.
        </p>
      </header>

      <main className="app__main">
        <PdfSettings
          headerText={headerText}
          footerText={footerText}
          onHeaderChange={setHeaderText}
          onFooterChange={setFooterText}
          disabled={isBusy}
        />

        <FileDropzone
          onFilesSelect={handleFilesSelect}
          disabled={isBusy}
          fileCount={jobs.length}
        />

        {jobs.length > 0 && (
          <section className="batch-panel">
            <div className="batch-panel__header">
              <div>
                <h2>Conversion queue</h2>
                <p>
                  {jobs.length} file{jobs.length !== 1 ? 's' : ''} · {readyCount} ready ·{' '}
                  {convertedCount} converted
                </p>
              </div>
              <div className="batch-panel__actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleConvertAll}
                  disabled={isBusy || readyCount === 0}
                >
                  Convert All
                </button>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={handleDownloadAll}
                  disabled={isBusy || convertedCount === 0}
                >
                  Download All
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={handleClearAll}
                  disabled={isBusy}
                >
                  Clear All
                </button>
              </div>
            </div>

            <ProgressBar
              progress={batchProgress}
              phase={batchPhase}
              visible={batchActive}
            />
          </section>
        )}

        {globalMessage && <p className="status status--success">{globalMessage}</p>}

        {jobs.length > 0 && (
          <div className="file-list">
            {jobs.map((job) => (
              <FileJobCard
                key={job.id}
                job={job}
                onConvert={handleConvert}
                onDownload={handleDownload}
                onRemove={handleRemove}
                disabled={isBusy && !['uploading', 'converting', 'downloading'].includes(job.status)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="app__footer">
        <p>Secure client-side processing · Files never leave your browser</p>
      </footer>
    </div>
  )
}

export default App
