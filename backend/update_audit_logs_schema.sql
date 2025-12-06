
-- Add missing columns to audit_logs table
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Verify policies (re-apply just in case)
DROP POLICY IF EXISTS "Service Role Full Access Audit Logs" ON audit_logs;
CREATE POLICY "Service Role Full Access Audit Logs" ON audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
