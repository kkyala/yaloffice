import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';

const router = Router();

// GET /api/resumes/:userId
router.get('/:userId', async (req, res) => {
    const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', req.params.userId)
        .order('version', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /api/resumes
router.post('/', async (req, res) => {
    const { user_id, parsed_data } = req.body;

    try {
        // Get current count for versioning
        const { count, error: countError } = await supabase
            .from('resumes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user_id);

        if (countError) throw countError;
        const nextVersion = (count || 0) + 1;

        // Set others to not current
        await supabase
            .from('resumes')
            .update({ is_current: false })
            .eq('user_id', user_id);

        // Insert new
        const { data, error } = await supabase
            .from('resumes')
            .insert({
                user_id,
                version: nextVersion,
                parsed_data,
                is_current: true,
            })
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
