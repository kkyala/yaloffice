-- 5. Create 'resumes' table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.resumes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    version int NOT NULL,
    parsed_data jsonb,
    is_current boolean DEFAULT false,
    file_path text, -- To store the path/URL of the uploaded file
    created_at timestamp with time zone DEFAULT now()
);

-- 6. Add 'file_path' to 'resumes' if it was missing (for existing tables)
ALTER TABLE public.resumes 
ADD COLUMN IF NOT EXISTS file_path text;

-- 7. Add 'screening_transcript' to 'users' to store the full conversation
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS screening_transcript text;
