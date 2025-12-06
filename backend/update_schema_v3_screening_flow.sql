-- Update schema for Job-specific Screening Flow

-- 1. Add screening configuration to 'jobs' table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS screening_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS screening_config jsonb DEFAULT '{}'::jsonb;

-- 2. Add job_id to 'screening_assessments' to link assessment to a specific job
ALTER TABLE public.screening_assessments
ADD COLUMN IF NOT EXISTS job_id bigint REFERENCES public.jobs(id);

-- 3. Add index for faster lookup of assessments by job
CREATE INDEX IF NOT EXISTS idx_screening_job_id ON public.screening_assessments(job_id);

-- 4. Ensure 'candidates' (applications) table has necessary status values
-- We don't need to change schema if 'status' is just text, but good to note the expected values:
-- 'Applied', 'Screening Pending', 'Screening Completed', 'Interview Scheduled', 'Rejected', 'Hired'

-- 5. Add RLS policy for screening_assessments to allow Agents/Employers to view
-- (Assuming 'screening_assessments' already has basic RLS from previous setup)

CREATE POLICY "Employers/Agents can view all screening assessments"
ON public.screening_assessments
FOR SELECT
TO authenticated
USING (
    exists (
        select 1 from public.users 
        where id = auth.uid() 
        and role in ('Employer', 'Agent')
    )
);
