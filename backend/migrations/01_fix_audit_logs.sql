
-- Fix audit_logs table missing user_id column
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id);
