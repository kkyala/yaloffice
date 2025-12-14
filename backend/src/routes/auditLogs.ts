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

// POST /api/audit-logs
router.post('/', async (req, res) => {
    const { userId, action, details, resourceType, resourceId } = req.body;

    // Minimal validation
    if (!action) return res.status(400).json({ error: 'Missing required field: action' });

    const { data, error } = await supabase.from('audit_logs').insert({
        user_id: userId, // Optional, can be null for anonymous
        action,
        details,
        resource_type: resourceType, // Maps camelCase to snake_case if needed
        resource_id: resourceId
    }).select().single();

    if (error) {
        // Log locally if DB fails, but don't crash request if possible (or do, depending on strictness)
        console.error('Audit Log Insert Failed:', error);
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

export default router;
