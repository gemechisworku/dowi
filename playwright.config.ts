import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // The page's `main > *` entrance fade (`@media (prefers-reduced-motion:
    // reduce) { animation: none }` in index.css) means this also disables
    // it for every test — avoids axe (and anything asserting a computed
    // style) sampling mid-fade, diluted colors as a flaky artifact of an
    // animation timing, not a real bug.
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'Pixel 7 · light',
      use: { ...devices['Pixel 7'], colorScheme: 'light' },
    },
    {
      name: 'Pixel 7 · dark',
      use: { ...devices['Pixel 7'], colorScheme: 'dark' },
    },
  ],
})
