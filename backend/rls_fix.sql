-- RLS Policies Fix for Yal Office

-- 1. Allow Candidates (Users) to update their own Application
-- This is required for:
--  - Submitting Pre-Interview Assessments
--  - Updating application details
CREATE POLICY "Users can update own applications" ON public.candidates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Allow Authenticated Users to Insert Audit Logs
-- This is required for frontend logging (e.g., interview started, errors)
CREATE POLICY "Enable insert for authenticated users" ON public.audit_logs
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- 3. (Optional) Ensure Service Role has full access (Backend)
-- These overrides ensure the backend always works regardless of user context if using service key
CREATE POLICY "Service role full access candidates" ON public.candidates
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access audit_logs" ON public.audit_logs
  USING (true)
  WITH CHECK (true);
