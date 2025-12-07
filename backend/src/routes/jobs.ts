import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';

const router = Router();

// GET /api/jobs
router.get('/', async (req, res) => {
    const { employer } = req.query;
    let query = supabase.from('jobs').select('*');

    if (employer) {
        query = query.eq('employer', employer);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /api/jobs
router.post('/', async (req, res) => {
    const { data, error } = await supabase.from('jobs').insert(req.body).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// PATCH /api/jobs/:id
router.patch('/:id', async (req, res) => {
    const { data, error } = await supabase.from('jobs').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

export default router;
