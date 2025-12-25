import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';

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
        const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password, options });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ session: data.session, user: data.user });
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

    // supabase.auth.resetPasswordForEmail sends a password recovery email
    const { data, error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, data });
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
