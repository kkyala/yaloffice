import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';
import { pdfService } from '../services/pdfService.js';
import { auditLogger } from '../services/auditLogger.js';
import { emailService } from '../services/emailService.js';

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

// GET /api/candidates/:id
router.get('/:id', async (req, res) => {
    const { data, error } = await supabase.from('candidates').select('*').eq('id', req.params.id).single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Candidate not found' });
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

    // Insert candidate first
    const { data: candidate, error } = await supabase.from('candidates').insert(req.body).select().single();
    if (error) return res.status(500).json({ error: error.message });

    // Check for existing screening assessment
    if (candidate && user_id) {
        // Try to find a screening for this job first, then general
        const { data: screenings } = await supabase
            .from('screening_assessments')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (screenings && screenings.length > 0) {
            // Find best match: same job_id or no job_id
            const match = screenings.find(s => s.job_id === jobId) || screenings.find(s => !s.job_id);

            if (match) {
                // Update candidate with screening report
                const screeningReport = {
                    score: match.overall_score,
                    summary: match.summary,
                    strengths: match.strengths,
                    weaknesses: match.weaknesses,
                    skillsAnalysis: match.skills_analysis,
                    transcript: match.transcript,
                    date: match.created_at
                };

                const newConfig = {
                    ...(candidate.interview_config || {}),
                    screeningReport,
                    screeningStatus: 'completed',
                    aiScore: match.overall_score // Set initial AI score from screening
                };

                await supabase
                    .from('candidates')
                    .update({ interview_config: newConfig })
                    .eq('id', candidate.id);

                // Return updated candidate
                candidate.interview_config = newConfig;
            }
        }
    }

    res.json(candidate);
});

// PUT /api/candidates/:id
router.put('/:id', async (req, res) => {
    console.log(`[PUT /candidates/${req.params.id}] Updating candidate...`);
    console.log('[PUT DEBUG] Request Body:', JSON.stringify(req.body));

    // DEBUG: Check if candidate exists first to rule out RLS/Visibility issues
    const { data: existing, error: findError } = await supabase.from('candidates').select('id').eq('id', req.params.id).maybeSingle();
    if (findError) console.error('[PUT DEBUG] Find Error:', findError);
    else console.log('[PUT DEBUG] Found existing candidate?', existing ? 'YES' : 'NO');

    // Sanitize body: remove fields that are not columns (unless mapped)
    // The frontend sends interviewStatus/screeningStatus at top level, but they belong in interview_config (which is also present)
    const { interviewStatus, screeningStatus, ...cleanBody } = req.body;

    console.log('[PUT DEBUG] Clean Body:', JSON.stringify(cleanBody));

    // Remove .single() to prevent "Cannot coerce" error error if update returns 0 rows or unexpected format
    const { data, error } = await supabase.from('candidates').update(cleanBody).eq('id', req.params.id).select();

    if (error) {
        console.error('Supabase Update Error:', error);
        return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
        console.warn(`[PUT /candidates/${req.params.id}] No rows updated.`);
        if (existing) {
            console.warn('[PUT DEBUG] Candidate exists but update returned 0 rows. Likely RLS issue or no data changed.');
            // Check if we are potentially running as Anon? 
            // We can't check easily here, but we can return more info.
            return res.status(404).json({ error: `Candidate ${req.params.id} found but not updated (RLS or no changes).` });
        }
        return res.status(404).json({ error: `Candidate ${req.params.id} not found.` });
    }

    const updatedCandidate = data[0];

    // Audit Log
    try {
        await auditLogger.log({
            userId: 'system', // TODO: Extract actual user from auth middleware if available
            action: 'candidate_updated',
            resourceType: 'candidate',
            resourceId: req.params.id,
            details: { changes: req.body }
        });
    } catch (logError) {
        console.error('Audit log failed:', logError);
    }

    // Check if we need to generate PDF reports (if interview is finished and they don't exist yet)
    const config = updatedCandidate.interview_config;
    if (config && config.transcript && config.analysis && !config.reportUrl) {
        // Trigger async report generation
        processInterviewReportGenerationAsync(updatedCandidate)
            .catch(err => console.error('[Candidates] Report generation failed:', err));
    }

    res.json(updatedCandidate);
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
    let transcript = config?.transcript;

    if (!transcript) {
        // Allow generating report even if transcript is missing (e.g. only summary available)
        // Check if we have at least analysis or score
        if (!config?.analysis && config?.aiScore === undefined) {
            return res.status(404).json({ error: 'Interview report data not found' });
        }
        transcript = "Transcript not available or not recorded.";
    }

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

/**
 * Generate and upload interview reports (Full, Score, Transcript)
 */
async function processInterviewReportGenerationAsync(candidate: any) {
    console.log(`[Report Gen] Starting for candidate ${candidate.id}...`);
    try {
        const { id, name, jobId, interview_config } = candidate;
        const { transcript, analysis, aiScore } = interview_config;

        if (!transcript || !analysis) return;

        // Get Job Title
        const { data: job } = await supabase.from('jobs').select('title').eq('id', jobId).single();
        const jobTitle = job?.title || 'Unknown Position';
        const timestamp = Date.now();

        // 1. Generate PDFs
        const fullReportPdf = await pdfService.generateInterviewReport(name, jobTitle, analysis, transcript);
        const scoreCardPdf = await pdfService.generateScoreCard(name, jobTitle, aiScore || analysis.score, analysis.scoreBreakdown);
        const transcriptPdf = await pdfService.generateTranscriptPdf(name, jobTitle, transcript);

        // 2. Upload to Supabase Storage
        // Paths: reports/, scores/, transcripts/
        const reportPath = `reports/interview_${id}_${timestamp}.pdf`;
        const scorePath = `scores/scorecard_${id}_${timestamp}.pdf`;
        const transcriptPath = `transcripts/transcript_${id}_${timestamp}.pdf`;

        // Parallel Uploads
        await Promise.all([
            supabase.storage.from('resumes').upload(reportPath, fullReportPdf, { contentType: 'application/pdf', upsert: true }),
            supabase.storage.from('resumes').upload(scorePath, scoreCardPdf, { contentType: 'application/pdf', upsert: true }),
            supabase.storage.from('resumes').upload(transcriptPath, transcriptPdf, { contentType: 'application/pdf', upsert: true }),
        ]);

        // 3. Get Public URLs
        const { data: { publicUrl: reportUrl } } = supabase.storage.from('resumes').getPublicUrl(reportPath);
        const { data: { publicUrl: scoreUrl } } = supabase.storage.from('resumes').getPublicUrl(scorePath);
        const { data: { publicUrl: transcriptUrl } } = supabase.storage.from('resumes').getPublicUrl(transcriptPath);

        // 4. Update Candidate Record
        const newConfig = {
            ...interview_config,
            reportUrl,
            scoreUrl,
            transcriptUrl,
            pdfGenerationDate: new Date().toISOString()
        };

        await supabase
            .from('candidates')
            .update({ interview_config: newConfig })
            .eq('id', id);

        console.log(`[Report Gen] Successfully generated and linked PDFs for candidate ${id}`);

        // 5. Send Email to Candidate
        if (candidate.user_id) {
            const { data: user } = await supabase.from('users').select('email').eq('id', candidate.user_id).single();
            if (user && user.email) {
                await emailService.sendInterviewReportEmail(
                    user.email,
                    name,
                    jobTitle,
                    analysis,
                    transcript
                );
            }
        }

    } catch (error) {
        console.error('[Report Gen] Error:', error);
    }
}

export default router;
