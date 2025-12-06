-- Fix RLS for 'resumes' table and 'storage.objects'
-- Run this in Supabase SQL Editor

-- 1. Fix 'resumes' table RLS (Priority)
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can insert their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can select their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can update their own resumes" ON public.resumes;

-- Create Policies
-- Note: user_id is UUID in the table definition, so auth.uid() (UUID) should match directly.
-- However, we cast to text just in case to avoid "operator does not exist" errors if there's a type mismatch.
-- Actually, looking at the schema, user_id is uuid. auth.uid() is uuid.
-- But previous errors showed issues. Let's try direct comparison first, if that fails we can cast.
-- Given the previous error "operator does not exist: uuid = text", it implies one side was text.
-- If user_id is UUID, then auth.uid() = user_id is UUID=UUID.
-- If the error persists, it might be because `auth.uid()` is sometimes treated as text in some contexts or extensions?
-- Let's use the safe approach: cast both to text for comparison.

CREATE POLICY "Users can insert their own resumes"
ON public.resumes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can select their own resumes"
ON public.resumes
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own resumes"
ON public.resumes
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id::text);


-- 2. Fix Storage RLS for 'resumes' bucket
-- We try to create policies without dropping to avoid "must be owner" errors if we don't own the existing policies.
-- If policies already exist with these names, these commands might fail.
-- In that case, you might need to manually delete them in the dashboard UI if they are incorrect.

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow uploads
-- We use a DO block to check if policy exists to avoid errors, or just try CREATE and ignore error?
-- SQL doesn't have "CREATE POLICY IF NOT EXISTS".
-- We will try to drop them using a more permissive approach or just overwrite?
-- Let's try to DROP only if we own them? No, we can't check that easily.
-- We will just try to CREATE. If it fails saying "policy exists", that's fine, as long as the existing policy is correct.
-- But if the existing policy is WRONG, we need to replace it.
-- The user saw "must be owner" on DROP. This implies they can't drop.
-- So we will try to CREATE with a NEW unique name to ensure our policy is active.

CREATE POLICY "Allow authenticated uploads to resumes_v2"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'resumes' );

CREATE POLICY "Allow authenticated read access to resumes_v2"
ON storage.objects
FOR SELECT
TO authenticated
USING ( bucket_id = 'resumes' );

CREATE POLICY "Allow public read access to resumes_v2"
ON storage.objects
FOR SELECT
TO public
USING ( bucket_id = 'resumes' );

