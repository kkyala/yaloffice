import { test, expect } from '@playwright/test';

test('Verify Interview Flow with Demo User', async ({ page }) => {
    // 1. Navigate
    await page.goto('/');
    await expect(page).toHaveTitle(/YalOffice|Recruitment|AI/i);

    // 2. Sign Up
    // Look for a link to switch to signup mode
    const signUpLink = page.getByText('Sign up', { exact: false });
    if (await signUpLink.isVisible()) {
        await signUpLink.click();
    }

    // Fill credentials
    // Ensure we are on a form that accepts email/password
    await page.getByPlaceholder(/email/i).fill('test.demo.playwright@yalhire.ai');
    await page.getByPlaceholder(/password/i).fill('Password123!');

    // Submit - Look for "Sign Up" button now
    const signUpBtn = page.getByRole('button', { name: /sign up/i });
    // If not found, maybe it's still "Sign In" button but in signup mode? or "Create Account"
    if (await signUpBtn.isVisible()) {
        await signUpBtn.click();
    } else {
        // Fallback to whatever button is there
        await page.getByRole('button').first().click();
    }

    // 3. Verify Login success (Dashboard)
    // Wait for URL change or dashboard element
    await page.waitForTimeout(3000);

    // Take screenshot of where we landed
    await page.screenshot({ path: 'test-results/dashboard.png' });

    // 4. Start Interview
    // If we are on dashboard, look for "Start Interview" or "Screening"
    const startBtn = page.getByText('Start Interview', { exact: false }).first();
    if (await startBtn.isVisible()) {
        await startBtn.click();
    } else {
        // Maybe "New Application"?
        console.log('Start Interview button not found, checking alternatives...');
    }

    // 5. Verify LiveKit Loading
    // Look for "Connecting" or "AI Interviewer"
    await expect(page.getByText(/connecting|joining/i)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/interview-connecting.png' });
});
