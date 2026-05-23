import { defineConfig, devices } from '@playwright/test'

/**
 * Configuración Playwright para QA visual de Mallatex Suite.
 * Cubre 4 breakpoints (móvil pequeño, móvil, tablet, desktop, desktop ancho)
 * y reporta evidencia en HTML + screenshots.
 */
export default defineConfig({
  testDir: './qa/tests',
  outputDir: './qa/output/results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: './qa/output/report', open: 'never' }],
    ['json', { outputFile: './qa/output/results.json' }],
  ],

  use: {
    baseURL: process.env.QA_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
  },

  projects: [
    {
      name: 'mobile-sm',
      use: { ...devices['iPhone SE'], viewport: { width: 320, height: 568 } },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Mini'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'desktop-xl',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
