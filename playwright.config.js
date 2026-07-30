import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,  // los tests de auth comparten estado de sesión
  retries: 1,
  timeout: 20_000,
  expect: { timeout: 5_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: 'http://localhost:3333',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Chromium pre-instalado en el entorno de CI
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH
        || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Servidor local de archivos estáticos
  webServer: {
    command: 'npx serve . -p 3333 --no-clipboard',
    url: 'http://localhost:3333',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
