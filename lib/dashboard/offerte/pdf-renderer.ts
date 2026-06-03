/**
 * Puppeteer-renderer voor de offerte-PDF. Geport vanuit schoon-straatje
 * (src/services/pdf.ts). Genereert PDF als Buffer, met compact-mode
 * escalation als de content niet op één A4 past.
 *
 * Server-only (puppeteer + chromium). Mag NIET in client-componenten.
 * Wordt aangeroepen vanuit server actions / route handlers.
 */

import puppeteer, { type Browser, type Page } from 'puppeteer'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { renderOffertePDFHtml, type OffertePDFData } from './pdf-template'

// ── Asset loading: logo + badge cachen als base64 data-URLs ─────────
let cachedLogoDataUrl: string | null | undefined
let cachedBadgeDataUrl: string | null | undefined

function loadAssetBase64(relPath: string, label: string): string | null {
  // process.cwd() is de project-root op zowel dev (.) als VPS-build.
  const assetPath = path.join(process.cwd(), 'public', 'assets', 'schoon-straatje', relPath)
  if (!existsSync(assetPath)) {
    console.warn(`[pdf-renderer] ${label} not found at ${assetPath}, skipping`)
    return null
  }
  const buffer = readFileSync(assetPath)
  return `data:image/png;base64,${buffer.toString('base64')}`
}

export function loadLogoBase64(): string | null {
  if (cachedLogoDataUrl === undefined) {
    cachedLogoDataUrl = loadAssetBase64('logo.png', 'Logo')
  }
  return cachedLogoDataUrl
}

export function loadBadgeBase64(): string | null {
  if (cachedBadgeDataUrl === undefined) {
    cachedBadgeDataUrl = loadAssetBase64('top-30-vakbedrijven.png', 'Top-30-vakbedrijven badge')
  }
  return cachedBadgeDataUrl
}

// ── Shared browser instance ──────────────────────────────────────────
let browserPromise: Promise<Browser> | null = null

async function launchBrowser(): Promise<Browser> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  // Bij crash/disconnect invalideren we de cache zodat de volgende
  // getBrowser() een verse instance start i.p.v. een dode connection.
  browser.on('disconnected', () => {
    browserPromise = null
  })
  return browser
}

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    try {
      const existing = await browserPromise
      if (existing.connected) return existing
    } catch {
      // launch faalde eerder, reset en probeer opnieuw
    }
    browserPromise = null
  }
  browserPromise = launchBrowser()
  return browserPromise
}

async function openPageResilient(): Promise<Page> {
  try {
    const browser = await getBrowser()
    return await browser.newPage()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!/connection closed|target closed|protocol error/i.test(msg)) throw err
    browserPromise = null
    const browser = await getBrowser()
    return browser.newPage()
  }
}

/**
 * Genereer de offerte als PDF Buffer. Probeert eerst normale layout;
 * bij overflow render-pass 2 met compactLevel=1 (kleiner logo),
 * pass 3 met compactLevel=2 (tightere padding). Als 't dan nog steeds
 * niet past, schalen we de hele page proportioneel omlaag (cap 0.75).
 */
export async function renderOffertePDFBuffer(data: OffertePDFData): Promise<Buffer> {
  const page = await openPageResilient()
  try {
    let compactLevel: 0 | 1 | 2 = 0
    for (;;) {
      const html = renderOffertePDFHtml({ ...data, compactLevel })
      // domcontentloaded ipv networkidle0: HTML heeft geen externe
      // resources (logo is base64 inline), dus wachten op netwerk-stilte
      // heeft geen waarde. 15s timeout voor snellere failure-recovery.
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const overflows = await measureOverflow(page)
      if (!overflows || compactLevel === 2) break
      compactLevel = (compactLevel + 1) as 1 | 2
    }

    // Final fallback: als level 2 nog steeds niet past, zoom de page
    // proportioneel omlaag (min scale 0.75 zodat tekst leesbaar blijft).
    await page.evaluate(() => {
      const A4_HEIGHT_PX = 1123
      const el = document.getElementById('offerte-page')
      if (!el) return
      const renderedHeight = el.offsetHeight
      if (renderedHeight > A4_HEIGHT_PX) {
        const scale = Math.max(A4_HEIGHT_PX / renderedHeight, 0.75)
        ;(el.style as unknown as { zoom: string }).zoom = String(scale)
      }
    })

    const pdfData = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    })
    return Buffer.from(pdfData)
  } finally {
    await page.close()
  }
}

async function measureOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const A4_HEIGHT_PX = 1123 // 297mm @ 96dpi
    const el = document.getElementById('offerte-page')
    if (!el) return false
    return el.offsetHeight > A4_HEIGHT_PX
  })
}

/** Sluit de gedeelde browser-instance (handig voor graceful shutdown of tests). */
export async function closePdfBrowser(): Promise<void> {
  if (browserPromise) {
    const p = browserPromise
    browserPromise = null
    try {
      const browser = await p
      await browser.close()
    } catch {
      // Browser was al dood, niks te sluiten
    }
  }
}
