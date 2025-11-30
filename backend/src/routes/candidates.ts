import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';

const router = Router();

// GET /api/candidates
router.get('/', async (req, res) => {
    const { user_id, jobId } = req.query;
    let query = supabase.from('candidates').select('*');

    if (user_id) {
        query = query.eq('user_id', user_id);
    }
    if (jobId) {
        // Handle array of jobIds if needed, but for now simple eq or in
        if (Array.isArray(jobId)) {
            query = query.in('jobId', jobId);
        } else {
            query = query.eq('jobId', jobId);
        }
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /api/candidates
router.post('/', async (req, res) => {
    // Check for existing application
    const { user_id, jobId } = req.body;
    if (user_id && jobId) {
        const { data: existing } = await supabase.from('candidates').select('id').eq('user_id', user_id).eq('jobId', jobId).maybeSingle();
        if (existing) return res.status(400).json({ error: 'You have already applied for this job.' });
    }

    const { data, error } = await supabase.from('candidates').insert(req.body).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// PUT /api/candidates/:id
router.put('/:id', async (req, res) => {
    const { data, error } = await supabase.from('candidates').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// GET /api/candidates/:id/report/screening
router.get('/:id/report/screening', async (req, res) => {
    const { data: candidate, error } = await supabase.from('candidates').select('*').eq('id', req.params.id).single();
    if (error || !candidate) return res.status(404).json({ error: 'Candidate not found' });

    const report = candidate.interview_config?.screeningReport;
    if (!report) return res.status(404).json({ error: 'Screening report not found' });

    const { data: job } = await supabase.from('jobs').select('title').eq('id', candidate.jobId).single();
    const jobTitle = job?.title || 'Unknown Position';

    try {
        const pdfBuffer = await pdfService.generateScreeningReport(candidate.name, jobTitle, report);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${candidate.name}_Screening_Report.pdf"`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// GET /api/candidates/:id/report/interview
router.get('/:id/report/interview', async (req, res) => {
    const { data: candidate, error } = await supabase.from('candidates').select('*').eq('id', req.params.id).single();
    if (error || !candidate) return res.status(404).json({ error: 'Candidate not found' });

    const config = candidate.interview_config;
    if (!config?.transcript) return res.status(404).json({ error: 'Interview transcript not found' });

    const analysis = config.analysis || {
        score: config.aiScore || 0,
        summary: 'No detailed analysis available.',
        strengths: [],
        improvements: []
    };

    const { data: job } = await supabase.from('jobs').select('title').eq('id', candidate.jobId).single();
    const jobTitle = job?.title || 'Unknown Position';

    try {
        const pdfBuffer = await pdfService.generateInterviewReport(candidate.name, jobTitle, analysis, config.transcript);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${candidate.name}_Interview_Report.pdf"`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

export default router;
