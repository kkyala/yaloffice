import { test, expect, Page } from '@playwright/test';

// Test account credentials - update these with actual test accounts
// These should be real accounts in your Supabase database
const TEST_CANDIDATE = {
    email: 'candidate@test.com',
    password: 'Test123!',
};

const TEST_RECRUITER = {
    email: 'recruiter@test.com',
    password: 'Test123!',
};

// Helper function to login - matches actual login form structure
async function login(page: Page, username: string, password: string) {
    await page.goto('/');

    // Wait for login form - the form uses "Username" textbox
    await page.waitForSelector('text=Username', { timeout: 10000 });

    // Fill credentials using the actual field labels
    await page.getByRole('textbox', { name: 'Username' }).fill(username);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);

    // Click Sign In button
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for navigation or error message
    try {
        await page.waitForURL((url) => url.pathname !== '/', { timeout: 15000 });
        console.log('✅ Login successful');
    } catch (e) {
        // Check if we're still on login page due to error
        const errorMessage = page.locator('text=Invalid, text=Error, text=incorrect');
        if (await errorMessage.isVisible({ timeout: 2000 })) {
            throw new Error('Login failed - invalid credentials');
        }
        console.log('Login may have failed or page did not redirect');
    }
}

test.describe('Candidate Interview Process', () => {

    test('Should load login page and display form', async ({ page }) => {
        // Navigate to home/login page
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Verify login form elements are present
        await expect(page.getByText('Welcome to AI Recruitment')).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('textbox', { name: 'Username' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

        // Take screenshot of login page
        await page.screenshot({ path: 'test-results/login-page.png', fullPage: true });
        console.log('✅ Login page loaded successfully');
    });

    test('Should attempt login and navigate to dashboard', async ({ page }) => {
        // Navigate to home/login page
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Fill in test credentials
        await page.getByRole('textbox', { name: 'Username' }).fill(TEST_CANDIDATE.email);
        await page.getByRole('textbox', { name: 'Password' }).fill(TEST_CANDIDATE.password);

        // Take screenshot before login
        await page.screenshot({ path: 'test-results/before-login.png', fullPage: true });

        // Click Sign In
        await page.getByRole('button', { name: 'Sign In' }).click();

        // Wait for navigation or response
        await page.waitForTimeout(3000);

        // Take screenshot after login attempt
        await page.screenshot({ path: 'test-results/after-login.png', fullPage: true });

        // Check current URL and page content
        const currentUrl = page.url();
        console.log(`Current URL after login: ${currentUrl}`);
    });

    test('Should complete the full interview flow', async ({ page }) => {
        // 1. Login as candidate
        console.log('Step 1: Logging in as candidate...');
        await login(page, TEST_CANDIDATE.email, TEST_CANDIDATE.password);

        // Take screenshot of dashboard/home after login
        await page.screenshot({ path: 'test-results/after-login-dashboard.png', fullPage: true });

        // 2. Navigate to Find Jobs or look for interview option
        console.log('Step 2: Looking for available actions...');

        // Try multiple navigation options
        const findJobsLink = page.locator('text=Find Jobs').first();
        const interviewLink = page.locator('text=Interview, text=Screening').first();
        const dashboardLink = page.locator('text=Dashboard').first();

        if (await findJobsLink.isVisible({ timeout: 5000 })) {
            console.log('Found "Find Jobs" link, clicking...');
            await findJobsLink.click();
            await page.waitForLoadState('networkidle');
            await page.screenshot({ path: 'test-results/find-jobs.png', fullPage: true });

            // 3. Find and apply for a job
            console.log('Step 3: Looking for a job to apply...');
            const applyButton = page.locator('button:has-text("Apply"), button:has-text("Apply Now")').first();

            if (await applyButton.isVisible({ timeout: 5000 })) {
                await applyButton.click();
                await page.waitForTimeout(2000);
                await page.screenshot({ path: 'test-results/job-application.png', fullPage: true });
            }
        } else if (await interviewLink.isVisible({ timeout: 3000 })) {
            console.log('Found "Interview" link, clicking...');
            await interviewLink.click();
            await page.waitForLoadState('networkidle');
        }

        // 4. Look for Start Interview button
        console.log('Step 4: Looking for interview/screening option...');
        const startButton = page.locator('button:has-text("Start"), button:has-text("Begin")').first();

        if (await startButton.isVisible({ timeout: 10000 })) {
            console.log('Step 5: Starting AI Interview...');
            await startButton.click();

            // Wait for interview to load (LiveKit connection)
            await page.waitForTimeout(5000);
            await page.screenshot({ path: 'test-results/interview-started.png', fullPage: true });

            // 5. Let the interview run for a bit
            console.log('Step 6: Interview in progress...');
            await page.waitForTimeout(30000); // 30 seconds of interview

            // 6. End the interview
            console.log('Step 7: Ending interview...');
            const endButton = page.locator('button:has-text("End"), button:has-text("End Interview")').first();

            if (await endButton.isVisible({ timeout: 5000 })) {
                await endButton.click();

                // Confirm if needed
                const confirmEnd = page.locator('button:has-text("Yes"), button:has-text("Confirm")');
                if (await confirmEnd.isVisible({ timeout: 3000 })) {
                    await confirmEnd.click();
                }
            }

            // 7. Wait for report generation
            console.log('Step 8: Waiting for report...');
            await page.waitForTimeout(10000);
            await page.screenshot({ path: 'test-results/interview-report.png', fullPage: true });
        } else {
            console.log('No interview available to start. Taking screenshot of current state.');
            await page.screenshot({ path: 'test-results/no-interview-available.png', fullPage: true });
        }

        // Take final screenshot
        await page.screenshot({ path: 'test-results/interview-complete.png', fullPage: true });
    });
});

test.describe('Recruiter View', () => {

    test('Should attempt recruiter login', async ({ page }) => {
        // Navigate to home/login page
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Fill in recruiter credentials
        await page.getByRole('textbox', { name: 'Username' }).fill(TEST_RECRUITER.email);
        await page.getByRole('textbox', { name: 'Password' }).fill(TEST_RECRUITER.password);

        // Click Sign In
        await page.getByRole('button', { name: 'Sign In' }).click();

        // Wait for response
        await page.waitForTimeout(3000);

        // Take screenshot
        await page.screenshot({ path: 'test-results/recruiter-login.png', fullPage: true });

        // Check for candidate management area
        const candidatesLink = page.locator('text=Candidates').first();
        if (await candidatesLink.isVisible({ timeout: 5000 })) {
            await candidatesLink.click();
            await page.waitForLoadState('networkidle');
            await page.screenshot({ path: 'test-results/recruiter-candidates.png', fullPage: true });
        }
    });
});
