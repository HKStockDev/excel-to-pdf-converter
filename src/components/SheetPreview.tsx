import type { WorkbookPreview } from '../utils/excelToPdf'

type SheetPreviewProps = {
  preview: WorkbookPreview
}

export function SheetPreview({ preview }: SheetPreviewProps) {
  return (
    <section className="preview-card">
      <div className="preview-card__header">
        <h2>Workbook preview</h2>
        <span className="preview-card__file">{preview.fileName}</span>
      </div>

      <ul className="preview-card__list">
        {preview.sheets.map((sheet) => (
          <li key={sheet.name} className="preview-card__item">
            <span className="preview-card__sheet-name">{sheet.name}</span>
            <span className="preview-card__meta">
              {sheet.rowCount} rows · {sheet.columnCount} columns
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
