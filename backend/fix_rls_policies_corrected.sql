-- Run this in your Supabase SQL Editor to fix RLS policies
-- Corrected with type casting for UUID vs Text comparisons

-- 1. Enable RLS on tables (if not already)
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Policies for 'interviews' table

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."interviews";
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON "public"."interviews";
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON "public"."interviews";

-- Allow Authenticated users to INSERT their own interviews
CREATE POLICY "Enable insert for authenticated users only" ON "public"."interviews"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow Authenticated users to SELECT their own interviews
-- Casting auth.uid() to text to match candidate_id if it is text
CREATE POLICY "Enable select for users based on user_id" ON "public"."interviews"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid()::text = candidate_id);

-- Allow Authenticated users to UPDATE their own interviews
CREATE POLICY "Enable update for users based on user_id" ON "public"."interviews"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (auth.uid()::text = candidate_id)
WITH CHECK (auth.uid()::text = candidate_id);


-- 3. Policies for 'audit_logs' table

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."audit_logs";
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON "public"."audit_logs";

-- Allow Authenticated users to INSERT logs
CREATE POLICY "Enable insert for authenticated users" ON "public"."audit_logs"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow Authenticated users to SELECT their own logs
CREATE POLICY "Enable select for users based on user_id" ON "public"."audit_logs"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);
