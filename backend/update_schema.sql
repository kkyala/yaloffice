-- Run this script in your Supabase SQL Editor to update the database schema

-- 1. Update 'jobs' table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS job_code text,
ADD COLUMN IF NOT EXISTS business_unit text,
ADD COLUMN IF NOT EXISTS client text,
ADD COLUMN IF NOT EXISTS client_bill_rate text,
ADD COLUMN IF NOT EXISTS pay_rate text,
ADD COLUMN IF NOT EXISTS recruitment_manager text,
ADD COLUMN IF NOT EXISTS primary_recruiter text,
ADD COLUMN IF NOT EXISTS qualifications text,
ADD COLUMN IF NOT EXISTS open boolean default true,
ADD COLUMN IF NOT EXISTS sourced int default 0,
ADD COLUMN IF NOT EXISTS screened int default 0,
ADD COLUMN IF NOT EXISTS shortlisted int default 0,
ADD COLUMN IF NOT EXISTS interviewed int default 0,
ADD COLUMN IF NOT EXISTS "salaryMin" numeric,
ADD COLUMN IF NOT EXISTS "salaryMax" numeric;

-- 2. Update 'interviews' table to match backend expectations (snake_case)
ALTER TABLE public.interviews
ADD COLUMN IF NOT EXISTS room_name text,
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS candidate_id text,
ADD COLUMN IF NOT EXISTS candidate_name text,
ADD COLUMN IF NOT EXISTS question_count int,
ADD COLUMN IF NOT EXISTS current_question_index int,
ADD COLUMN IF NOT EXISTS difficulty text,
ADD COLUMN IF NOT EXISTS custom_questions jsonb,
ADD COLUMN IF NOT EXISTS analysis jsonb,
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ended_at timestamp with time zone;

-- Note: The 'interviews' table might have old columns like "candidateId", "startTime" etc. 
-- The backend now uses the snake_case columns above.

-- 3. Ensure 'candidates' table has correct columns (if needed)
-- (candidates table seems mostly correct with "jobId" but let's ensure interview_config is jsonb)
ALTER TABLE public.candidates
ALTER COLUMN interview_config TYPE jsonb USING interview_config::jsonb;

-- 4. Update 'users' table for AI Screening
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS screening_status text,
ADD COLUMN IF NOT EXISTS screening_report jsonb;
