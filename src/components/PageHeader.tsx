type PageHeaderProps = {
  fileCount?: number
}

export function PageHeader({ fileCount = 0 }: PageHeaderProps) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header className="page-header">
      <div className="page-header__inner">
        <button
          type="button"
          className="page-header__brand"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span className="page-header__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="page-header__brand-text">
            <span className="page-header__title">Excel to PDF Converter</span>
            <span className="page-header__tagline">Document Conversion Suite</span>
          </span>
        </button>

        <nav className="page-header__nav" aria-label="Main navigation">
          <button type="button" onClick={() => scrollTo('pdf-settings')}>
            PDF Layout
          </button>
          <button type="button" onClick={() => scrollTo('upload')}>
            Upload
          </button>
          {fileCount > 0 && (
            <button type="button" onClick={() => scrollTo('file-queue')}>
              Queue ({fileCount})
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
