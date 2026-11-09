const { test, expect } = require('@playwright/test')
const fs = require('node:fs/promises')
const path = require('node:path')

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const EMAIL = process.env.PERF_EMAIL
const PASSWORD = process.env.PERF_PASSWORD

async function signIn(page) {
  if (!EMAIL || !PASSWORD) throw new Error('Set PERF_EMAIL and PERF_PASSWORD for the dedicated Performance Lab principal.')
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 20000 })
}

test('principal UI routes render and report navigation timings', async ({ page }) => {
  const pageErrors = []
  const serverErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`)
  })

  await signIn(page)
  const routes = [
    '/dashboard', '/students', '/classes', '/subjects', '/staff',
    '/attendance', '/reports', '/results', '/exams', '/tests',
    '/teacher-assignments', '/notifications', '/school-certificates',
  ]
  const timings = []
  const screenshotDir = path.join(process.cwd(), 'performance-results', 'ui-screenshots')
  await fs.mkdir(screenshotDir, { recursive: true })

  for (const route of routes) {
    const started = Date.now()
    const response = await page.goto(`${BASE_URL}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    const durationMs = Date.now() - started
    expect(response, `${route} should return a document response`).not.toBeNull()
    expect(response.status(), `${route} returned HTTP ${response.status()}`).toBeLessThan(400)
    await expect(page.locator('body')).not.toBeEmpty()
    await page.screenshot({ path: path.join(screenshotDir, `${route.replaceAll('/', '_').replace(/^_/, '') || 'home'}.png`), fullPage: true })
    timings.push({ route, status: response.status(), domContentLoadedMs: durationMs })
    expect(durationMs, `${route} DOMContentLoaded exceeded 8 seconds`).toBeLessThan(8000)
  }

  await fs.writeFile(
    path.join(process.cwd(), 'performance-results', 'ui-navigation-timings.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE_URL, timings, pageErrors, serverErrors }, null, 2),
  )
  expect(pageErrors, 'uncaught browser exceptions').toEqual([])
  expect(serverErrors, 'HTTP 5xx responses while navigating').toEqual([])
})

test('dashboard and student list fit a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  for (const route of ['/dashboard', '/students']) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }))
    expect(dimensions.documentWidth, `${route} has horizontal page overflow: ${JSON.stringify(dimensions)}`)
      .toBeLessThanOrEqual(dimensions.viewportWidth + 1)
  }
})
