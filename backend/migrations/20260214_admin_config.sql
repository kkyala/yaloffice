
-- 1. System Configurations Table
CREATE TABLE IF NOT EXISTS public.system_configurations (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    is_secret BOOLEAN DEFAULT false,
    "group" TEXT DEFAULT 'General',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.system_configurations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can read config" ON public.system_configurations
    FOR SELECT USING (exists (select 1 from public.users where id = auth.uid() and role = 'Admin'));

CREATE POLICY "Admins can update config" ON public.system_configurations
    FOR UPDATE USING (exists (select 1 from public.users where id = auth.uid() and role = 'Admin'));

CREATE POLICY "Admins can insert config" ON public.system_configurations
    FOR INSERT WITH CHECK (exists (select 1 from public.users where id = auth.uid() and role = 'Admin'));

-- 2. Modify Users Table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
-- If role is not present or checked, we might need:
-- ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('Candidate', 'Employer', 'Agent', 'Admin'));

-- 3. Create Admin User (Password: admin123)
-- Hash generated via bcrypt: $2b$10$L2K8bdRMvhu1te4Kqg90vutRfg.8Xsf3EjgPGTdekhUuMlepjqPYS
INSERT INTO public.users (id, email, password_hash, role, name, status)
VALUES (
    uuid_generate_v4(), 
    'admin@yaloffice.com', 
    '$2b$10$L2K8bdRMvhu1te4Kqg90vutRfg.8Xsf3EjgPGTdekhUuMlepjqPYS', 
    'Admin', 
    'System Administrator',
    'Active'
) ON CONFLICT (email) DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    role = 'Admin';

-- 4. Insert Default Keys (Populate with placeholders)
INSERT INTO public.system_configurations (key, value, description, is_secret, "group") VALUES
('OPENAI_API_KEY', '', 'API Key for OpenAI (GPT)', true, 'LLM'),
('DEEPGRAM_API_KEY', '', 'API Key for Deepgram (STT/TTS)', true, 'Voice'),
('LIVEKIT_API_KEY', '', 'API Key for LiveKit Server', true, 'Realtime'),
('LIVEKIT_API_SECRET', '', 'Secret Key for LiveKit Server', true, 'Realtime'),
('LIVEKIT_URL', 'ws://localhost:7880', 'WebSocket URL for LiveKit', false, 'Realtime'),
('SMTP_HOST', '', 'SMTP Server Host', false, 'Email'),
('SMTP_USER', '', 'SMTP Username', false, 'Email'),
('SMTP_PASS', '', 'SMTP Password', true, 'Email'),
('OLLAMA_BASE_URL', 'http://localhost:11434', 'URL for local Ollama instance', false, 'LLM')
ON CONFLICT (key) DO NOTHING;
