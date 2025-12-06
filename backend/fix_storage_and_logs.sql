
-- 1. Ensure audit_logs table exists
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Policies for audit_logs
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service Role Full Access Audit Logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;

-- Allow Service Role to do everything on audit_logs
CREATE POLICY "Service Role Full Access Audit Logs" ON audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow Users to read their own logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. Ensure resumes bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. Storage Policies for resumes bucket
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Service Role Full Access Storage" ON storage.objects;

-- Allow authenticated users to upload their own resumes
-- Path convention: user_id/filename
CREATE POLICY "Users can upload own resumes" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to view their own resumes
CREATE POLICY "Users can view own resumes" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to update their own resumes
CREATE POLICY "Users can update own resumes" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own resumes
CREATE POLICY "Users can delete own resumes" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow Service Role full access to storage (Critical for backend operations)
CREATE POLICY "Service Role Full Access Storage" ON storage.objects
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
