import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';

const router = Router();

// GET /api/placements
router.get('/', async (req, res) => {
    const { data, error } = await supabase.from('placements').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

export default router;
