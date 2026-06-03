/**
 * Pure export-builders: zetten een generieke tabel ({columns, rows}) om naar
 * CSV, Excel (.xlsx) of PDF. BEWUST vrij van Supabase/next/headers-imports
 * zodat ze los (zonder auth-context) te unit-testen zijn. De data-fetching
 * + dispatch zit in export-service.ts.
 *
 * exceljs en puppeteer worden lazy ge-import (binnen de functie) zodat het
 * importeren van dit bestand goedkoop blijft en CSV geen Chromium meelaadt.
 */

export type ExportFormat = 'csv' | 'xlsx' | 'pdf'

export interface ExportTable {
  /** Mensvriendelijke titel (PDF-kop + Excel-sheetnaam). */
  title: string
  /** Basis voor de bestandsnaam, zonder extensie (bv. "leads-2026-06-03"). */
  filenameBase: string
  columns: string[]
  rows: (string | number | null)[][]
}

export interface ExportArtifact {
  body: string | Buffer
  contentType: string
  filename: string
}

/** Neutraliseert CSV-formule-injectie + quote-escaping (zoals de oude route). */
function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  // Cellen die met =, +, -, @, tab of CR beginnen worden door Excel/Sheets
  // als formule geïnterpreteerd → prefix met apostrof + altijd quoten.
  if (/^[=+\-@\t\r]/.test(s)) {
    return `"'${s.replace(/"/g, '""')}"`
  }
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function buildCsv(table: ExportTable): string {
  const lines = [table.columns.map(csvEscape).join(',')]
  for (const row of table.rows) {
    lines.push(row.map(csvEscape).join(','))
  }
  // UTF-8 BOM zodat Excel é/²/€ correct toont bij dubbelklikken.
  return '﻿' + lines.join('\n')
}

export async function buildXlsx(table: ExportTable): Promise<Buffer> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Frontlix'
  // Sheetnaam mag max 31 tekens + geen \ / ? * [ ] :
  const sheetName = table.title.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Export'
  const ws = wb.addWorksheet(sheetName)

  ws.addRow(table.columns)
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1A56FF' }, // Frontlix-primary
  }
  headerRow.alignment = { vertical: 'middle' }

  for (const row of table.rows) {
    ws.addRow(row.map((c) => (c === null ? '' : c)))
  }

  // Kolombreedtes: ruwe auto-fit op basis van de langste waarde (cap 50).
  ws.columns.forEach((col, i) => {
    let max = table.columns[i]?.length ?? 10
    for (const row of table.rows) {
      const len = row[i] === null || row[i] === undefined ? 0 : String(row[i]).length
      if (len > max) max = len
    }
    col.width = Math.min(50, Math.max(10, max + 2))
  })

  ws.views = [{ state: 'frozen', ySplit: 1 }] // header bevriezen

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Genereert een gestileerde HTML-tabel voor de PDF-render. */
export function renderTableHtml(table: ExportTable): string {
  const thead = table.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')
  const tbody = table.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    )
    .join('')

  const generated = new Date().toLocaleString('nl-NL', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Inter, Arial, sans-serif; color: #1A1A1A; margin: 0; padding: 0; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1A56FF; padding-bottom: 8px; margin-bottom: 12px; }
  .title { font-size: 18px; font-weight: 800; color: #1A56FF; }
  .meta { font-size: 10px; color: #555; text-align: right; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  thead th { background: #1A56FF; color: #fff; text-align: left; padding: 5px 6px; font-weight: 700; }
  tbody td { padding: 4px 6px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #F5F7FA; }
  .count { margin-top: 10px; font-size: 9px; color: #555; }
</style></head>
<body>
  <div class="head">
    <div class="title">${escapeHtml(table.title)}</div>
    <div class="meta">Frontlix · geëxporteerd ${escapeHtml(generated)}</div>
  </div>
  <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
  <div class="count">${table.rows.length} ${table.rows.length === 1 ? 'rij' : 'rijen'}</div>
</body></html>`
}

export async function buildPdf(table: ExportTable): Promise<Buffer> {
  const puppeteer = (await import('puppeteer')).default
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(renderTableHtml(table), { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

/** Bouwt het downloadbare artefact (body + headers) voor het gekozen formaat. */
export async function buildArtifact(
  table: ExportTable,
  format: ExportFormat,
): Promise<ExportArtifact> {
  switch (format) {
    case 'xlsx':
      return {
        body: await buildXlsx(table),
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${table.filenameBase}.xlsx`,
      }
    case 'pdf':
      return {
        body: await buildPdf(table),
        contentType: 'application/pdf',
        filename: `${table.filenameBase}.pdf`,
      }
    case 'csv':
    default:
      return {
        body: buildCsv(table),
        contentType: 'text/csv; charset=utf-8',
        filename: `${table.filenameBase}.csv`,
      }
  }
}
