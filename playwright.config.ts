import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'html',
    timeout: 120000, // 2 minutes per test
    expect: {
        timeout: 10000,
    },
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3001',
        trace: 'on-first-retry',
        video: 'on',
        screenshot: 'only-on-failure',
        headless: false, // Set to true for CI
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'echo "Services should be running via start_services.bat"',
        url: 'http://localhost:3001',
        reuseExistingServer: true,
        timeout: 5000,
    },
});
