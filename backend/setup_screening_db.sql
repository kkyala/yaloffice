-- Create the screening_assessments table
CREATE TABLE IF NOT EXISTS public.screening_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL,
    overall_score INTEGER,
    summary TEXT,
    strengths JSONB,
    weaknesses JSONB,
    skills_analysis JSONB,
    transcript TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.screening_assessments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow Service Role (Backend) to do everything
-- (Service role bypasses RLS by default, but explicit policies are good practice if using a restricted key)

-- Policy: Allow Users to SELECT their own assessments
CREATE POLICY "Users can view their own screening assessments" 
ON public.screening_assessments 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Policy: Allow Users to INSERT their own assessments (if needed from client, but we prefer backend)
-- We'll rely on the backend's Service Role Key to perform the INSERTs.

-- Index for faster lookup by user
CREATE INDEX IF NOT EXISTS idx_screening_user_id ON public.screening_assessments(user_id);
