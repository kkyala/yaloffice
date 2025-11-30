
-- Fix RLS Infinite Recursion by using auth.jwt() metadata
-- Run this script in Supabase SQL Editor

-- 1. Drop existing policies that cause recursion
drop policy if exists "Employers/Agents can read candidates" on public.users;
drop policy if exists "Employers/Agents can insert jobs" on public.jobs;
drop policy if exists "Employers/Agents can update jobs" on public.jobs;
drop policy if exists "Employers/Agents can read all applications" on public.candidates;
drop policy if exists "Employers/Agents can update applications" on public.candidates;
drop policy if exists "Employers/Agents can read resumes" on public.resumes;

-- 2. Re-create policies using JWT metadata for role checks
-- This avoids querying the users table within the policy, preventing recursion.

-- Users Table
create policy "Employers/Agents can read candidates" on public.users for select using (
  role = 'Candidate' and 
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('Employer', 'Agent')
);

-- Jobs Table
create policy "Employers/Agents can insert jobs" on public.jobs for insert with check (
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('Employer', 'Agent')
);

create policy "Employers/Agents can update jobs" on public.jobs for update using (
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('Employer', 'Agent')
);

-- Candidates Table
create policy "Employers/Agents can read all applications" on public.candidates for select using (
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('Employer', 'Agent')
);

create policy "Employers/Agents can update applications" on public.candidates for update using (
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('Employer', 'Agent')
);

-- Resumes Table
create policy "Employers/Agents can read resumes" on public.resumes for select using (
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('Employer', 'Agent')
);

-- 3. Ensure Service Role has full access (Implicit, but good to verify)
-- If you are using the Service Role Key in the backend, RLS is bypassed automatically.

-- 4. Fix missing profile for 'candidate100@yaloffice.com' (if applicable)
-- This handles the case where signup succeeded but profile creation failed due to recursion.
do $$
begin
  if exists (select 1 from auth.users where email = 'candidate100@yaloffice.com') then
    insert into public.users (id, email, name, role, status)
    select id, email, coalesce(raw_user_meta_data->>'name', 'Candidate 100'), coalesce(raw_user_meta_data->>'role', 'Candidate'), 'Active'
    from auth.users
    where email = 'candidate100@yaloffice.com'
    and not exists (select 1 from public.users where id = auth.users.id);
  end if;
end $$;
