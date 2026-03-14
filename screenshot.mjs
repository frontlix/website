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

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
await page.screenshot({ path: outPath, fullPage: true })
await browser.close()

console.log(`Saved: ${outPath}`)
