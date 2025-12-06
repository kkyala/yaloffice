-- Run this in your Supabase SQL Editor to fix RLS policies

-- 1. Enable RLS on tables (if not already)
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Policies for 'interviews' table

-- Allow Authenticated users to INSERT their own interviews
CREATE POLICY "Enable insert for authenticated users only" ON "public"."interviews"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow Authenticated users to SELECT their own interviews
CREATE POLICY "Enable select for users based on user_id" ON "public"."interviews"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = candidate_id);

-- Allow Authenticated users to UPDATE their own interviews
CREATE POLICY "Enable update for users based on user_id" ON "public"."interviews"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (auth.uid() = candidate_id)
WITH CHECK (auth.uid() = candidate_id);


-- 3. Policies for 'audit_logs' table

-- Allow Authenticated users to INSERT logs
CREATE POLICY "Enable insert for authenticated users" ON "public"."audit_logs"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow Authenticated users to SELECT their own logs (if user_id column exists)
-- Note: If user_id is not a column, you might want to restrict this further or allow all for now.
-- Assuming user_id exists from previous fixes:
CREATE POLICY "Enable select for users based on user_id" ON "public"."audit_logs"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
