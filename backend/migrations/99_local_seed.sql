
-- Seed Admin User for Local Development

-- 1. Insert into auth.users (Must exist for FK)
INSERT INTO auth.users (
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    created_at, 
    updated_at, 
    role, 
    aud
)
VALUES (
    '7e3a2881-7846-4284-8f31-dc822512a15e', -- Must match the ID in 20260214_admin_config.sql
    'admin@yaloffice.com',
    '$2b$10$abcdefghijklmnopqrstuv', -- Dummy bcrypt hash for auth.users (not used by our custom auth, but good to have)
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert into public.users (This failed in previous script due to FK)
INSERT INTO public.users (
    id, 
    email, 
    password_hash, 
    role, 
    name, 
    created_at
)
VALUES (
    '7e3a2881-7846-4284-8f31-dc822512a15e',
    'admin@yaloffice.com',
    '$2b$10$abcdefghijklmnopqrstuv', -- Actual hash used by our custom auth
    'Admin',
    'System Administrator',
    now()
)
ON CONFLICT (id) DO UPDATE 
SET 
    role = 'Admin',
    password_hash = EXCLUDED.password_hash;
