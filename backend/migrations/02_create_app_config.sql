
-- Create configurations table
CREATE TABLE IF NOT EXISTS public.app_configurations (
    key text PRIMARY KEY,
    value text NOT NULL,
    description text,
    "group" text DEFAULT 'general',
    is_secret boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.app_configurations ENABLE ROW LEVEL SECURITY;

-- Policies

-- Admin can do everything
CREATE POLICY "Admins can manage configurations" ON public.app_configurations
    USING (exists (select 1 from public.users where id = auth.uid() and role = 'Admin'))
    WITH CHECK (exists (select 1 from public.users where id = auth.uid() and role = 'Admin'));

-- Authenticated users (or Service Role) can read non-secret configs
-- For backend service usage, the Service Role (which bypasses RLS) will be used.
-- For frontend usage, we might allow reading non-secret values.
CREATE POLICY "Authenticated users can read public configurations" ON public.app_configurations
    FOR SELECT
    USING (auth.role() = 'authenticated' AND is_secret = false);

-- Insert some default values (Example)
INSERT INTO public.app_configurations (key, value, description, "group", is_secret)
VALUES 
    ('site_name', 'YalHire AI', 'Global site name', 'general', false),
    ('maintenance_mode', 'false', 'Enable maintenance mode', 'general', false),
    ('ai_model_default', 'gemma:2b', 'Default AI model for interviews', 'ai', false)
ON CONFLICT (key) DO NOTHING;
