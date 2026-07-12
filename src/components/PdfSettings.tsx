type PdfSettingsProps = {
  headerText: string
  footerText: string
  onHeaderChange: (value: string) => void
  onFooterChange: (value: string) => void
  disabled?: boolean
}

export function PdfSettings({
  headerText,
  footerText,
  onHeaderChange,
  onFooterChange,
  disabled = false,
}: PdfSettingsProps) {
  return (
    <section className="pdf-settings">
      <div className="pdf-settings__header">
        <h2>PDF layout</h2>
        <p>Custom header and footer text appear on every page. Page numbers are added automatically.</p>
      </div>

      <div className="pdf-settings__fields">
        <label className="pdf-settings__field">
          <span>Header text</span>
          <input
            type="text"
            value={headerText}
            onChange={(event) => onHeaderChange(event.target.value)}
            placeholder="e.g. Company Report — Q1 2026"
            disabled={disabled}
            maxLength={120}
          />
        </label>

        <label className="pdf-settings__field">
          <span>Footer text</span>
          <input
            type="text"
            value={footerText}
            onChange={(event) => onFooterChange(event.target.value)}
            placeholder="e.g. Confidential — Internal Use Only"
            disabled={disabled}
            maxLength={120}
          />
        </label>
      </div>
    </section>
  )
}
