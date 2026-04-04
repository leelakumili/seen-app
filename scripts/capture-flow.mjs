#!/usr/bin/env node
/**
 * capture-flow.mjs
 *
 * Captures a walkthrough of the Seen UI and produces docs/ui-flow.webp.
 *
 * Prerequisites:
 *   brew install ffmpeg          (animated WebP encoding)
 *   npm install puppeteer        (one-time, not in devDeps)
 *   npm run dev                  (Vite dev server must be running on :5173)
 *
 * Run:
 *   node scripts/capture-flow.mjs
 */

import puppeteer  from 'puppeteer'
import { execSync } from 'child_process'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')
const FRAMES    = join(ROOT, 'docs', '_frames')
const OUT       = join(ROOT, 'docs', 'ui-flow.webp')
const BASE_URL  = 'http://localhost:5173'

// ── View sequence ────────────────────────────────────────────────────────────

const VIEWS = [
  {
    name:  '01-home',
    path:  '/#/',
    label: 'Home',
    delay: 1800,
  },
  {
    name:  '02-log',
    path:  '/#/log',
    label: 'Log',
    delay: 1800,
  },
  {
    name:  '03-amplify-1on1',
    path:  '/#/amplify',
    label: 'Amplify — 1:1 Prep',
    delay: 1600,
    action: async (page) => {
      // Already on 1:1 tab by default
    },
  },
  {
    name:  '04-amplify-brag',
    path:  null, // stay on /amplify, just click tab
    label: 'Amplify — Brag Doc',
    delay: 1600,
    action: async (page) => {
      await page.evaluate(() => {
        const tabs = document.querySelectorAll('button')
        const brag = [...tabs].find(b => b.textContent?.trim() === 'Brag Doc')
        brag?.click()
      })
      await sleep(400)
    },
  },
  {
    name:  '05-amplify-quarterly',
    path:  null,
    label: 'Amplify — Quarterly',
    delay: 1600,
    action: async (page) => {
      await page.evaluate(() => {
        const tabs = document.querySelectorAll('button')
        const q    = [...tabs].find(b => b.textContent?.trim() === 'Quarterly Review')
        q?.click()
      })
      await sleep(400)
    },
  },
  {
    name:  '06-amplify-ask',
    path:  null,
    label: 'Amplify — Ask',
    delay: 1600,
    action: async (page) => {
      await page.evaluate(() => {
        const tabs = document.querySelectorAll('button')
        const ask  = [...tabs].find(b => b.textContent?.trim() === 'Ask')
        ask?.click()
      })
      await sleep(400)
    },
  },
  {
    name:  '07-insights',
    path:  '/#/insights',
    label: 'Insights',
    delay: 1600,
  },
  {
    name:  '08-settings',
    path:  '/#/settings',
    label: 'Settings',
    delay: 1800,
  },
  {
    name:  '09-home-end',
    path:  '/#/',
    label: 'Home (end)',
    delay: 1800,
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function checkDeps() {
  try { execSync('which ffmpeg', { stdio: 'pipe' }) }
  catch {
    console.error('\n  ✗  ffmpeg not found — run: brew install ffmpeg\n')
    process.exit(1)
  }
}

function checkServer() {
  try { execSync(`curl -sf ${BASE_URL} -o /dev/null`, { stdio: 'pipe' }) }
  catch {
    console.error(`\n  ✗  Vite dev server not reachable at ${BASE_URL}\n     Run: npm run dev\n`)
    process.exit(1)
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  checkDeps()
  checkServer()

  // Clean + recreate frames dir
  if (existsSync(FRAMES)) rmSync(FRAMES, { recursive: true })
  mkdirSync(FRAMES, { recursive: true })

  console.log('\n  📸  Launching Puppeteer…')

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
  })
  const page = await browser.newPage()

  // Suppress console noise from the renderer
  page.on('console', () => {})
  page.on('pageerror', () => {})

  let frameIndex = 0

  for (const view of VIEWS) {
    // Navigate if a path is given (otherwise stay on current page)
    if (view.path) {
      await page.goto(`${BASE_URL}${view.path}`, { waitUntil: 'networkidle0', timeout: 15000 })
      await sleep(600) // let React settle
    }

    // Run any tab-click or interaction
    if (view.action) await view.action(page)

    // Capture
    const file = join(FRAMES, `${view.name}.png`)
    await page.screenshot({ path: file, fullPage: false })
    console.log(`  ✓  [${++frameIndex}/${VIEWS.length}] ${view.label}`)

    // Hold on this view (gives animated WebP dwell time)
    await sleep(view.delay)

    // Capture the same frame again so ffmpeg holds it long enough
    const hold = join(FRAMES, `${view.name}-hold.png`)
    await page.screenshot({ path: hold, fullPage: false })
  }

  await browser.close()

  // ── Build animated WebP via ffmpeg ──────────────────────────────────────

  console.log('\n  🎞   Building animated WebP…')

  // Build a concat demuxer file so each frame has the right duration
  const concatLines = []
  for (const view of VIEWS) {
    const ms      = view.delay
    const durSec  = (ms / 1000).toFixed(2)
    concatLines.push(`file '${FRAMES}/${view.name}.png'`)
    concatLines.push(`duration ${durSec}`)
    concatLines.push(`file '${FRAMES}/${view.name}-hold.png'`)
    concatLines.push(`duration 0.1`)
  }
  const concatFile = join(FRAMES, 'concat.txt')
  import('fs').then(({ writeFileSync }) => writeFileSync(concatFile, concatLines.join('\n')))

  // Small sleep to let the file write flush
  await sleep(200)

  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatFile}" ` +
    `-vf "scale=1280:-1:flags=lanczos" ` +
    `-loop 0 -quality 85 ` +
    `"${OUT}"`,
    { stdio: 'inherit' }
  )

  // Clean up temp frames
  rmSync(FRAMES, { recursive: true })

  console.log(`\n  ✅  Saved: docs/ui-flow.webp\n`)
}

main().catch(err => {
  console.error('\n  ✗  Capture failed:', err.message, '\n')
  process.exit(1)
})
