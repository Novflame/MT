const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
testDir: './tests/ui',
testMatch: '**/*.spec.cjs',
timeout: 60000,
expect: {
timeout: 10000,
},
workers: 1,
reporter: [
['list'],
['html', {
outputFolder: 'performance-results/playwright-report',
open: 'never',
}],
],
use: {
baseURL: process.env.PERF_BASE_URL || 'http://localhost:3000',
headless: true,
viewport: {
width: 1365,
height: 900,
},
screenshot: 'only-on-failure',
trace: 'retain-on-failure',
},
outputDir: 'performance-results/playwright-artifacts',
})
