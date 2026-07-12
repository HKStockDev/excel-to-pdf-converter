# Excel to PDF Converter

A clean React web app that lets users upload an Excel file, preview workbook sheets, convert to PDF, and download the result — all in the browser.

Built as a portfolio/demo project for client proposals requiring simple document conversion workflows.

## Features

- Drag-and-drop or click-to-upload Excel files (`.xlsx`, `.xls`, `.csv`)
- Workbook preview with sheet names, row counts, and column counts
- Multi-sheet PDF export (one page per sheet)
- Client-side processing — files never leave the browser
- Responsive, accessible UI with loading and error states

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript |
| Build tool | Vite |
| Excel parsing | [SheetJS (xlsx)](https://sheetjs.com/) |
| PDF generation | [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) |

## Quick Start

```bash
cd excel-to-pdf-converter
npm install
npm run dev
```

Open `http://localhost:5173` and upload a spreadsheet to test conversion.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |

## Project Structure

```
src/
├── components/
│   ├── FileDropzone.tsx   # Upload UI with drag-and-drop
│   └── SheetPreview.tsx   # Workbook summary before conversion
├── utils/
│   └── excelToPdf.ts      # Validation, parsing, and PDF export
├── App.tsx                # Main application flow
└── App.css                # Component styles
```

## Deployment

Build static assets and deploy to any static host (Vercel, Netlify, Cloudflare Pages, S3, etc.):

```bash
npm run build
```

The output in `dist/` is a fully static SPA with no backend required.

## Extending for Production

This demo covers the core flow. For a production client build, common enhancements include:

- Server-side conversion for large files or pixel-perfect layout
- Custom PDF styling (logo, headers, page numbers)
- Batch conversion and user accounts
- Progress indicators for large workbooks
- Unit and E2E tests

See `UPWORK_PROPOSAL.md` for a full client-facing proposal template.

## License

MIT — use freely for demos and client work.
