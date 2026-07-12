import { useState } from 'react'
import { FileDropzone } from './components/FileDropzone'
import { SheetPreview } from './components/SheetPreview'
import {
  convertExcelToPdf,
  downloadBlob,
  pdfFileNameFromExcel,
  previewWorkbook,
  validateExcelFile,
  type WorkbookPreview,
} from './utils/excelToPdf'
import './App.css'

type AppStatus = 'idle' | 'previewing' | 'converting' | 'success' | 'error'

function App() {
  const [status, setStatus] = useState<AppStatus>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<WorkbookPreview | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [generatedPdfName, setGeneratedPdfName] = useState<string | null>(null)

  const isBusy = status === 'previewing' || status === 'converting'

  const handleFileSelect = async (file: File) => {
    const validationError = validateExcelFile(file)
    if (validationError) {
      setErrorMessage(validationError)
      setStatus('error')
      return
    }

    setSelectedFile(file)
    setErrorMessage(null)
    setGeneratedPdfName(null)
    setStatus('previewing')

    try {
      const workbookPreview = await previewWorkbook(file)
      setPreview(workbookPreview)
      setStatus('idle')
    } catch {
      setPreview(null)
      setErrorMessage('Unable to read this file. Please upload a valid Excel workbook.')
      setStatus('error')
    }
  }

  const handleConvert = async () => {
    if (!selectedFile) {
      return
    }

    setStatus('converting')
    setErrorMessage(null)

    try {
      const pdfBlob = await convertExcelToPdf(selectedFile)
      const pdfName = pdfFileNameFromExcel(selectedFile.name)
      downloadBlob(pdfBlob, pdfName)
      setGeneratedPdfName(pdfName)
      setStatus('success')
    } catch {
      setErrorMessage('Conversion failed. Please try again with a different file.')
      setStatus('error')
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreview(null)
    setErrorMessage(null)
    setGeneratedPdfName(null)
    setStatus('idle')
  }

  return (
    <div className="app">
      <header className="app__header">
        <p className="app__eyebrow">Excel to PDF Converter</p>
        <h1>Turn spreadsheets into polished PDFs</h1>
        <p className="app__subtitle">
          Upload an Excel file, preview its sheets, and download a clean PDF in seconds.
        </p>
      </header>

      <main className="app__main">
        <FileDropzone
          onFileSelect={handleFileSelect}
          disabled={isBusy}
          selectedFileName={selectedFile?.name}
        />

        {status === 'previewing' && (
          <p className="status status--info">Reading workbook...</p>
        )}

        {errorMessage && <p className="status status--error">{errorMessage}</p>}

        {preview && (
          <>
            <SheetPreview preview={preview} />

            <div className="actions">
              <button
                type="button"
                className="button button--primary"
                onClick={handleConvert}
                disabled={isBusy}
              >
                {status === 'converting' ? 'Converting...' : 'Convert to PDF'}
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={handleReset}
                disabled={isBusy}
              >
                Start over
              </button>
            </div>
          </>
        )}

        {status === 'success' && generatedPdfName && (
          <p className="status status--success">
            Download started: <strong>{generatedPdfName}</strong>
          </p>
        )}
      </main>

      <footer className="app__footer">
        <p>Client-side conversion · Files never leave your browser</p>
      </footer>
    </div>
  )
}

export default App
