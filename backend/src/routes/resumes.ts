import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';
import { aiService } from '../services/aiService.js';
import { interviewStore } from '../services/interviewStore.js';
import { emailService } from '../services/emailService.js';

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
  const { user_id, parsed_data, file_content, file_type, file_name } = req.body;

  try {
    // Get current count for versioning
    const { count, error: countError } = await supabase
      .from('resumes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id);

    if (countError) throw countError;
    const nextVersion = (count || 0) + 1;

    let file_path = null;

    // Upload file to Supabase Storage if provided
    if (file_content && file_name) {
      // Convert base64 to buffer
      const base64Data = file_content.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const sanitizedFileName = file_name.replace(/[^a-zA-Z0-9.-]/g, '_');
      // Path: profiles/{userId}_{timestamp}_{filename}
      const filePath = `profiles/${user_id}_${Date.now()}_${sanitizedFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, buffer, {
          contentType: file_type,
          upsert: true
        });

      if (uploadError) {
        console.error('Resume upload error:', uploadError);
        // Continue without file if upload fails, or throw? Let's log and continue for now.
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('resumes')
          .getPublicUrl(filePath);
        file_path = publicUrlData.publicUrl;
      }
    }

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
        file_path
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger AI screening conversation automatically after resume save
    // This happens asynchronously so it doesn't block the response
    if (parsed_data && user_id) {
      // Get user info for screening
      const { data: userData } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', user_id)
        .single();

      if (userData) {
        // Send Profile Uploaded Email
        if (userData.email) {
          emailService.sendProfileUploadedEmail(userData.email, userData.name || 'Candidate')
            .catch(err => console.error('[Resume Routes] Failed to send profile upload email:', err));
        }

        // Process screening asynchronously (don't wait for it)
        processResumeScreeningAsync(
          parsed_data,
          user_id,
          userData.name || 'Candidate',
          userData.email || '',
          null, // jobTitle - will be set when candidate applies for a job
          undefined // jobId
        ).catch(err => {
          console.error('[Resume Routes] Error processing screening:', err);
          // Don't fail the request if screening fails
        });
      }
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Process resume screening asynchronously
 */
async function processResumeScreeningAsync(
  resumeData: any,
  userId: string,
  candidateName: string,
  candidateEmail: string,
  jobTitle?: string | null,
  jobId?: number
): Promise<void> {
  try {
    // Process resume through AI screening
    const assessment = await aiService.processResumeScreening(
      resumeData,
      candidateName,
      candidateEmail,
      jobTitle || undefined,
      jobId
    );

    // Save to screening_assessments table
    await interviewStore.saveScreeningAssessment({
      userId,
      jobTitle: jobTitle || 'General Application',
      jobId,
      score: assessment.score,
      summary: assessment.summary,
      strengths: assessment.strengths,
      weaknesses: assessment.weaknesses,
      skillsAnalysis: assessment.skillsAnalysis,
      transcript: assessment.transcript
    });

    console.log(`[Resume Routes] Screening assessment saved for user ${userId}`);
  } catch (error) {
    console.error('[Resume Routes] Error in processResumeScreeningAsync:', error);
    throw error;
  }
}

export default router;
