import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';

const router = Router();

// Middleware to check auth (basic version)
const requireAuth = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

    req.user = user;
    next();
};

// GET /api/users
router.get('/', requireAuth, async (req, res) => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// GET /api/users/:id
router.get('/:id', requireAuth, async (req, res) => {
    const { data, error } = await supabase.from('users').select('*').eq('id', req.params.id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'User not found' });
    res.json(data);
});

// PATCH /api/users/:id
router.patch('/:id', requireAuth, async (req, res) => {
    const { data, error } = await supabase.from('users').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /api/users (Create profile)
router.post('/', async (req, res) => {
    const { data, error } = await supabase.from('users').insert(req.body).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

export default router;
