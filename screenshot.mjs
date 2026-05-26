// screenshot.mjs — takes a full-page screenshot of a URL
// Usage: node screenshot.mjs <url> [label]
// Output: ./temporary screenshots/screenshot-N[-label].png

import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const url   = process.argv[2] || 'http://localhost:3000'
const label = process.argv[3] || ''

const dir = './temporary screenshots'
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

// Auto-increment: find the next available N
const existing = fs.readdirSync(dir)
  .map(f => f.match(/^screenshot-(\d+)/))
  .filter(Boolean)
  .map(m => parseInt(m[1], 10))
const n = existing.length ? Math.max(...existing) + 1 : 1
const filename = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`
const outPath = path.join(dir, filename)

// Mobile viewport: label bevat "mobile" of "iphone" → iPhone-maat (393x852).
// Andere labels (of geen label) krijgen desktop 1440x900.
const isMobile = /mobile|iphone/i.test(label)
const viewport = isMobile
  ? { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { width: 1440, height: 900 }

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
const page = await browser.newPage()
await page.setViewport(viewport)
if (isMobile) {
  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  )
}
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
await page.screenshot({ path: outPath, fullPage: true })
await browser.close()

console.log(`Saved: ${outPath}`)
