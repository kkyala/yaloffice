import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';
import { emailService } from '../services/emailService.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const trimmedEmail = email?.trim();
    const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });

    if (error) {
        return res.status(401).json({ error: error.message });
    }

    res.json({ session: data.session, user: data.user });
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password, options } = req.body;
        const trimmedEmail = email?.trim();

        // DEMO HACK: If email contains '.demo.', auto-confirm the user so we can log them in immediately.
        if (trimmedEmail.includes('.demo.')) {
            console.log(`[Auth] Creating auto-verified demo user: ${trimmedEmail}`);
            const { data: createData, error: createError } = await supabase.auth.admin.createUser({
                email: trimmedEmail,
                password: password,
                email_confirm: true,
                user_metadata: options?.data
            });

            if (createError) {
                return res.status(400).json({ error: createError.message });
            }

            // Now sign in to get the session
            const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password
            });

            if (sessionError) {
                return res.status(400).json({ error: sessionError.message });
            }

            // Send Verification Email (Fake it or skip it, but we want to simulate a real user mostly)
            // We can skip email sending for demo users.

            return res.json({ session: sessionData.session, user: createData.user });
        }

        // Use admin.generateLink to get the verification link directly
        // this avoids Supabase sending the default email and allows us to send a custom one
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'signup',
            email: trimmedEmail,
            password: password,
            options: options // Pass metadata (data: { name, role... })
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const user = data.user;
        const actionLink = data.properties?.action_link;

        // Send Verification Email
        if (user && user.email && actionLink) {
            // Use metadata name or part of email
            const name = user.user_metadata?.name || user.user_metadata?.full_name || trimmedEmail.split('@')[0];

            // Send our custom verification email
            emailService.sendVerificationEmail(trimmedEmail, actionLink, name)
                .catch(err => console.error('Failed to send verification email:', err));
        }

        // Return user. Session is null because email is not verified yet.
        res.json({ session: null, user: user });

    } catch (error: any) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal Server Error during signup' });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    const { email } = req.body;
    const trimmedEmail = email?.trim();

    if (!trimmedEmail) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Generate a password reset link using Supabase Admin
        // This bypasses Supabase's default email sending
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: trimmedEmail,
            // redirectTo: ... // Optional: set if you have a specific frontend reset page
        });

        if (error) {
            console.error('Error generating reset link:', error);
            // Don't leak user existence? Or Supabase error might be specific
            return res.status(400).json({ error: error.message });
        }

        if (data && data.properties && data.properties.action_link) {
            const resetLink = data.properties.action_link;

            // Send email using our custom EmailService
            await emailService.sendPasswordResetEmail(trimmedEmail, resetLink);

            res.json({ success: true, message: 'Password reset link sent' });
        } else {
            res.status(500).json({ error: 'Failed to generate reset link' });
        }
    } catch (err: any) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
    const { email, token, type } = req.body;

    if (!email || !token) {
        return res.status(400).json({ error: 'Email and Token are required' });
    }

    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: type || 'signup'
    });

    if (error) {
        return res.status(401).json({ error: error.message });
    }

    res.json({ session: data.session, user: data.user });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ user });
});

export default router;
