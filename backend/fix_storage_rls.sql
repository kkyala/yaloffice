-- Run this in your Supabase SQL Editor to fix Storage RLS policies

-- 1. Create the 'resumes' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on objects (standard practice)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies for 'resumes' to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow individual update" ON storage.objects;
DROP POLICY IF EXISTS "Allow individual delete" ON storage.objects;

-- 4. Create new policies

-- Allow Authenticated users to INSERT (upload) files to 'resumes' bucket
-- They can upload to any path, or we can restrict to their user_id folder if needed.
-- For now, allowing authenticated users to upload to 'resumes' bucket is sufficient.
CREATE POLICY "Allow authenticated uploads to resumes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'resumes' );

-- Allow Authenticated users to SELECT (read) files from 'resumes' bucket
CREATE POLICY "Allow authenticated read access to resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING ( bucket_id = 'resumes' );

-- Allow Public read access (if you want public URLs to work without signed URLs)
-- Since the code uses getPublicUrl, we likely need the bucket to be public or have a public policy.
-- The bucket creation above sets public=true, but RLS on objects still applies.
CREATE POLICY "Allow public read access to resumes"
ON storage.objects
FOR SELECT
TO public
USING ( bucket_id = 'resumes' );

-- Allow Users to UPDATE their own files
CREATE POLICY "Allow individual update"
ON storage.objects
FOR UPDATE
TO authenticated
USING ( bucket_id = 'resumes' AND auth.uid() = owner );

-- Allow Users to DELETE their own files
CREATE POLICY "Allow individual delete"
ON storage.objects
FOR DELETE
TO authenticated
USING ( bucket_id = 'resumes' AND auth.uid() = owner );
