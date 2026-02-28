
-- Create auth schema to mimic Supabase
create schema if not exists auth;

-- Create auth.users table
create table if not exists auth.users (
  instance_id uuid,
  id uuid not null primary key,
  aud character varying(255),
  role character varying(255),
  email character varying(255),
  encrypted_password character varying(255),
  email_confirmed_at timestamp with time zone,
  invited_at timestamp with time zone,
  confirmation_token character varying(255),
  confirmation_sent_at timestamp with time zone,
  recovery_token character varying(255),
  recovery_sent_at timestamp with time zone,
  email_change_token_new character varying(255),
  email_change character varying(255),
  email_change_sent_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  phone text,
  phone_confirmed_at timestamp with time zone,
  phone_change text,
  phone_change_token character varying(255),
  phone_change_sent_at timestamp with time zone,
  confirmed_at timestamp with time zone,
  email_change_token_current character varying(255),
  email_change_confirm_status smallint,
  banned_until timestamp with time zone,
  reauthentication_token character varying(255),
  reauthentication_sent_at timestamp with time zone,
  is_sso_user boolean default false,
  deleted_at timestamp with time zone
);

-- Extensions usually available in Supabase
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Mock auth.uid() function for RLS policies
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  -- Return a nil UUID or try to read from config if possible. 
  -- For local superuser usage, this doesn't matter much as RLS is bypassed.
  SELECT '00000000-0000-0000-0000-000000000000'::uuid; 
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
  SELECT 'service_role';
$$ LANGUAGE sql STABLE;
