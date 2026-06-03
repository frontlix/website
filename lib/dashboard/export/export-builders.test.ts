import { describe, it, expect } from 'vitest'
import { buildCsv, buildXlsx, buildPdf, type ExportTable } from './export-builders'

const table: ExportTable = {
  title: 'Leads',
  filenameBase: 'leads-test',
  columns: ['Lead-ID', 'Naam', 'Totaalprijs'],
  rows: [
    ['L-1', 'Jan, de Tester', '€ 1.234,50'],
    ['L-2', 'Café "Zürich"', 250],
    ['L-3', '=SUM(A1)', null], // formule-injectie test
  ],
}

describe('export-builders', () => {
  it('CSV: BOM + header + quoting + formule-injectie geneutraliseerd', () => {
    const csv = buildCsv(table)
    expect(csv.charCodeAt(0)).toBe(0xfeff) // UTF-8 BOM
    expect(csv).toContain('Lead-ID,Naam,Totaalprijs')
    expect(csv).toContain('"Jan, de Tester"') // komma → gequote
    expect(csv).toContain('"\'=SUM(A1)"') // formule → apostrof-prefix
  })

  it('XLSX: geldige zip-container (PK-signature)', async () => {
    const buf = await buildXlsx(table)
    expect(buf.length).toBeGreaterThan(100)
    expect(buf[0]).toBe(0x50) // 'P'
    expect(buf[1]).toBe(0x4b) // 'K'
  })

  it('PDF: geldige %PDF-header', async () => {
    const buf = await buildPdf(table)
    expect(buf.length).toBeGreaterThan(500)
    expect(Buffer.from(buf).subarray(0, 5).toString('utf8')).toBe('%PDF-')
  }, 60000)
})
