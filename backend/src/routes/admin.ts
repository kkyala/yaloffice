
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabaseService.js';
import { ConfigService } from '../services/configService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_me';

// Login Endpoint
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        // Verify User against public.users (Custom Auth)
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check Password Hash
        if (!user.password_hash) {
            return res.status(401).json({ error: 'User has no password set. Contact Support.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check Role
        if (user.role !== 'Admin') {
            return res.status(403).json({ error: 'Access denied. Admins only.' });
        }

        // Issue Token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });

    } catch (err: any) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Middleware to verify Admin Token
const verifyAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded.role !== 'Admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        (req as any).user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Get All Configurations
router.get('/config', verifyAdmin, async (req, res) => {
    try {
        const configs = await ConfigService.getAll();
        res.json(configs);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Update Configuration
router.post('/config', verifyAdmin, async (req, res) => {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required' });

    try {
        await ConfigService.set(key, value);
        res.json({ success: true, message: `Updated ${key}` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Initial Setup (Dev Helper) - Allow unauthenticated check if admin exists
router.get('/setup-check', async (req, res) => {
    try {
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'Admin');

        res.json({ adminExists: (count || 0) > 0 });
    } catch (err) {
        res.status(500).json({ error: 'Database check failed' });
    }
});
// Internal Endpoint for Agent to fetch config
router.get('/agent-config', async (req, res) => {
    try {
        const configs = await ConfigService.getAll();
        const configMap = configs.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        res.json(configMap);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
