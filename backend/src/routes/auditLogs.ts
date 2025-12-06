import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';

const router = Router();

// GET /api/audit-logs
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

export default router;
