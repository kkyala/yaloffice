
import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';

const router = Router();

// Middleware to check authentication
const requireAuth = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

    req.user = user;
    next();
};

// Middleware to require Admin role
const requireAdmin = async (req: any, res: any, next: any) => {
    // Ensure requireAuth ran first
    if (!req.user) {
        const token = req.headers.authorization?.split(' ')[1];

        // DEBUG LOG
        const fs = await import('fs');
        fs.appendFileSync('debug_log.txt', `[Config] Token: ${token ? token.substring(0, 10) + '...' : 'NONE'}\n`);

        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        const { data: { user }, error } = await supabase.auth.getUser(token);

        fs.appendFileSync('debug_log.txt', `[Config] User: ${user ? user.id : 'NULL'}, Error: ${error ? JSON.stringify(error) : 'NONE'}\n`);

        if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
        req.user = user;
    }

    // Check role in user metadata (or DB look up if strictly managed there)
    // Supabase often puts role in app_metadata or user_metadata.
    // Our local users table also has a 'role'.
    // Let's check the DB 'users' table for authority.

    // EMERGENCY BYPASS for local dev
    if (process.env.USE_LOCAL_DB === 'true' && req.user.email === 'admin@yaloffice.com') {
        // Trust the user object from auth shim/middleware
        if (req.user.role === 'Admin') {
            return next();
        }
    }

    const { data: userProfile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

    if (error || !userProfile || userProfile.role !== 'Admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    next();
};

// GET /api/config - Get all configurations (Admin sees all, others see non-secret)
router.get('/', requireAuth, async (req: any, res: any) => {
    const isAdmin = req.user.role === 'Admin' || (await supabase.from('users').select('role').eq('id', req.user.id).single()).data?.role === 'Admin';


    let query = supabase.from('app_configurations').select('*').order('group', { ascending: true }).order('key', { ascending: true });

    if (!isAdmin) {
        query = query.eq('is_secret', false);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /api/config - Create or Update configuration (Admin only)
router.post('/', requireAdmin, async (req, res) => {
    const { key, value, description, group, is_secret } = req.body;

    if (!key || value === undefined) {
        return res.status(400).json({ error: 'Key and Value are required' });
    }

    const { data, error } = await supabase
        .from('app_configurations')
        .upsert({
            key,
            value,
            description,
            "group": group || 'general',
            is_secret: is_secret || false,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// DELETE /api/config/:key - Delete configuration (Admin only)
router.delete('/:key', requireAdmin, async (req, res) => {
    const { error } = await supabase
        .from('app_configurations')
        .delete()
        .eq('key', req.params.key);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

export default router;
