import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

(async () => {
    console.log('Launching browser...');
    // Launching with arguments to allow media stream (microphone/camera) automatically
    const browser = await chromium.launch({
        headless: false,
        args: [
            '--use-fake-ui-for-media-stream', // Auto-accept permission prompts
            '--use-fake-device-for-media-stream' // Use fake media stream
        ]
    });
    const context = await browser.newContext({
        recordVideo: { dir: 'recordings/' },
        viewport: { width: 1280, height: 720 }
    });

    // Grant permissions for all pages in this context
    await context.grantPermissions(['microphone', 'camera']);

    const page = await context.newPage();

    // Log console messages from the page to debug
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', exception => console.log('PAGE ERROR:', exception));

    // Auto-accept simple dialogs (alert/confirm)
    page.on('dialog', async dialog => {
        console.log(`Dialog detected: ${dialog.message()}`);
        await dialog.accept();
    });

    try {
        console.log('Navigating to http://localhost:3001');
        await page.goto('http://localhost:3001', { timeout: 60000 });
        console.log('Page loaded.');

        // --- Scene 1: Usage & Application ---

        // 1. Sign Up
        console.log('Starting Sign Up flow...');
        const signUpLink = page.locator('text=Sign Up').first();
        if (await signUpLink.isVisible()) {
            await signUpLink.click();
        }

        // Use a unique email slightly different from last time or based on time
        const uniqueId = Date.now();
        const email = `alex.demo.${uniqueId}@example.com`;
        console.log(`Using email: ${email}`);

        await page.fill('#full-name', 'Alex Candidate');
        await page.fill('#email', email);
        await page.fill('#password', 'Password123!');
        await page.fill('#mobile-number', '5550123456');
        await page.selectOption('#role-select', 'Candidate');

        console.log('Submitting Sign Up form...');
        await page.click('button[type="submit"]');

        // Wait for OTP or Dashboard
        // Assuming the "API Error" is fixed, we should see the OTP screen or be logged in
        // If email verification is off/auto-login:
        try {
            await page.waitForSelector('.success-message', { timeout: 5000 });
            console.log('Success message appeared (likely OTP sent).');
        } catch (e) {
            console.log('No success message found, checking if redirected to dashboard...');
        }

        // Since we can't easily access the "email" for the OTP link in this script, 
        // we might rely on the backend being in a mode where it doesn't require it, 
        // Or if the user IS required to click a link, this demo might stop here.
        // BUT, looking at LoginScreen.tsx: 
        // if (result.autoLogin) return; 
        // else setShowOtpVerify(true).

        // If we are stuck at OTP, we can't proceed with the SAME session unless we fetch the token from DB.
        // For the sake of "Demo", maybe we can login as an existing user? 
        // Or, we can try to "Login" immediately if the backend allows it (it likely won't without verification).

        // Workaround: Monitor the "Check your email" state.
        // If stuck there, we'll try to use a hardcoded demo account if one existed?
        // Or better, let's assume the user has disabled verification for dev, OR we can't fully automate this step without DB access.

        // Wait, I can use the existing `candidate@yaloffice.com` / `candidate123` or similar if I knew it.
        // Let's TRY to create the user. If it says "Check your email", we are kind of stuck automating the NEXT step without DB access to the token.

        // However, I can check if "Candidate Dashboard" is visible.
        // If not, I will try to login with a known test account or fail gracefully.

        // Let's assume for this run, we want to try to see the error fixed.
        // If we see "Check your email", then the API call SUCCEEDED (Account created).

        await page.waitForTimeout(2000);
        const otpVisible = await page.locator('text=Check your email').isVisible();
        if (otpVisible) {
            console.log('Account created successfully! Validation email sent.');
            console.log('To proceed with "Happy Path" automation, we need to bypass email verification or use a pre-verified account.');
            console.log('Attempting to login with a "demo" account if available or pausing...');

            // For the purpose of the demo, let's try to Login with a standard test user if we can't verify.
            // But I don't have credentials.
            // I will pause here for the Screenshot.
            await page.screenshot({ path: 'demo_step1_signup_success.png' });

            // NOTE: To make the rest of the demo work, we need a logged-in session.
            // I'll assume we can't go further automatically in THIS run if verification is enforced.
            // Unless I can pull the verification token from the backend logs?
            // I can't read logs in real-time easily from here.

            return;
        }

        // If we were redirected (Auto-login):
        try {
            // "My Applications" seems to be the default landing page for Candidates in this config
            await page.waitForSelector('text=My Applications', { timeout: 15000 });
            console.log('Login Successful: Reached My Applications.');
        } catch (e) {
            // Fallback check
            await page.waitForSelector('text=Candidate Dashboard', { timeout: 5000 });
            console.log('Login Successful: Reached Candidate Dashboard.');
        }

        // 2. Find a Job
        console.log('Navigating to Find Jobs...');
        await page.click('text=Find Jobs');

        // Wait for jobs to load
        await page.waitForSelector('text=Apply Now', { timeout: 10000 });

        // Search for the Demo job
        console.log('Searching for Demo job...');
        await page.fill('input[placeholder*="Search"]', 'Demo');
        await page.waitForTimeout(2000); // Wait for debounce/filter
        await page.screenshot({ path: 'demo_search_results.png' });

        // Select the Demo job
        console.log('Selecting the Demo job...');
        // The jobs are in a table, find the first "Apply Now" button (which should be the demo job now)
        const applyBtn = page.locator('text=Apply Now').first();

        await applyBtn.waitFor({ state: 'visible', timeout: 10000 });
        await applyBtn.click();

        // await page.click('text=Apply Now'); // duplicate click avoidance

        // 3. Application Form
        console.log('Filling Application Form...');
        // Note: Resume upload is handled in My Resume screen usually, not here in this version.
        // Fill required fields
        await page.fill('#applicant-city', 'New York');
        await page.fill('#applicant-state', 'NY');
        await page.fill('#applicant-dob', '1990-01-01');

        await page.selectOption('#applicant-auth', 'US Citizen');
        await page.selectOption('#applicant-source', 'LinkedIn');
        await page.selectOption('#applicant-notice-period', 'Immediate');

        await page.fill('#applicant-summary', 'Experienced developer with a passion for AI.');

        await page.click('text=Submit');
        console.log('Application Submitted.');

        // 4. Pre-Interview Assessment & Interview
        console.log('Waiting for next step (Assessment or Dashboard)...');

        try {
            // Check if we are redirected to Pre-Interview Assessment
            await page.waitForSelector('text=Pre-Interview Assessment', { timeout: 10000 });
            console.log('Pre-Interview Assessment Screen Detected.');

            await page.selectOption('#notice-period', 'Immediately available');
            await page.fill('#salary-expectation', '150000');
            await page.selectOption('#work-authorization', 'US Citizen');

            // Radio: Willingness to relocate - Click "Yes"
            // The structure is likely label text.
            await page.click('text=Yes');

            await page.fill('#interest-reason', 'I love AI and this company mission.');

            await page.click('button:has-text("Submit Assessment")');
            console.log('Assessment Submitted. Waiting for Screening...');

        } catch (e) {
            console.log('No Pre-Interview Assessment detected (or timed out). Checking for dashboard...');
            // If not on assessment, maybe we are on dashboard or need to go there
            if (await page.locator('text=My Applications').isVisible()) {
                await page.click('text=My Applications');
            }
        }

        // 5. The Interview
        console.log('Starting Interview flow...');
        try {
            // Wait for "Start Screening" directly if redirected from assessment
            // Use fake timeout if we are already there
            await page.waitForSelector('text=Start Screening', { state: 'visible', timeout: 30000 });
            console.log('Ready to start screening.');
        } catch (e) {
            console.log('"Start Screening" not visible yet. Checking if we need to click "Screening"...');
            // If we are on dashboard, find the job and click 'Screening'
            try {
                const screeningBtn = page.locator('text=Screening');
                await screeningBtn.waitFor({ state: 'visible', timeout: 5000 });
                await screeningBtn.click();
                await page.waitForSelector('text=Start Screening', { state: 'visible', timeout: 20000 });
            } catch (innerE) {
                console.log('Could not start interview. Checking if just Applied...');
                await page.waitForSelector('text=Applied', { timeout: 5000 });
                console.log('Status is still Applied.');
                throw new Error('Interview setup failed - Status is Applied, expected Screening.');
            }
        }

        // Now click start screening
        await page.click('text=Start Screening');
        console.log('Interview in progress... (simulated)');

        // Wait a few seconds to simulate "Talking"
        await page.waitForTimeout(10000);

        // End Call
        console.log('Ending call...');
        if (await page.locator('text=End Interview').isVisible()) {
            await page.click('text=End Interview');
        } else if (await page.locator('text=End Screening').isVisible()) {
            await page.click('text=End Screening');
        } else {
            // Fallback
            try {
                await page.click('button[aria-label="End Call"]');
            } catch (e) {
                await page.click('button:has(svg)'); // Last resort
            }
        }

        console.log('Call Ended.');

        // 6. Results
        console.log('Waiting for analysis...');
        await page.waitForSelector('text=Screening Completed', { timeout: 60000 });

        console.log('Demo Complete. Taking final screenshot.');
        await page.screenshot({ path: 'demo_full_completion.png' });

    } catch (e) {
        console.error('Demo Error:', e);

        // Try to capture on-screen error
        try {
            const errorText = await page.innerText('.login-error');
            console.log('ON SCREEN ERROR:', errorText);
        } catch (ignore) { }

        await page.screenshot({ path: 'demo_failure.png' });

        const html = await page.content();
        fs.writeFileSync('page_dump.html', html);

    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
})();
