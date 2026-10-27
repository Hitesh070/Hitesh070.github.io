-- =========================================================================
-- SUPABASE COMPLETE DATABASE & STORAGE CONFIGURATION
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- =========================================================================

-- 1. Storage Bucket: temp_vault (Private)
insert into storage.buckets (id, name, public) 
values ('temp_vault', 'temp_vault', false) 
on conflict (id) do update set public = false;

drop policy if exists "vault_all_auth" on storage.objects;
create policy "vault_all_auth" on storage.objects 
for all to authenticated 
using (bucket_id = 'temp_vault') 
with check (bucket_id = 'temp_vault');

-- 2. Admin Scratchpad & Notes Table
create table if not exists public.admin_notes (
  id text primary key, 
  content text not null default '', 
  updated_at timestamptz not null default now(), 
  updated_by text
);

alter table public.admin_notes enable row level security;
drop policy if exists "notes_auth" on public.admin_notes;
create policy "notes_auth" on public.admin_notes 
for all to authenticated 
using (true) 
with check (true);

-- Version history for notes
create table if not exists public.admin_notes_history (
  id uuid primary key default gen_random_uuid(),
  note_id text not null,
  content text not null,
  saved_at timestamptz default now(),
  saved_by text
);

alter table public.admin_notes_history enable row level security;
drop policy if exists "notes_hist_auth" on public.admin_notes_history;
create policy "notes_hist_auth" on public.admin_notes_history 
for all to authenticated 
using (true) 
with check (true);

-- 3. Staged Vault Files Metadata Table
create table if not exists public.vault_files (
  id uuid primary key default gen_random_uuid(), 
  object_key text unique not null, 
  original_name text not null, 
  size bigint, 
  mime text, 
  device_label text, 
  uploaded_at timestamptz default now(), 
  expires_at timestamptz
);

alter table public.vault_files enable row level security;
drop policy if exists "vf_auth" on public.vault_files;
create policy "vf_auth" on public.vault_files 
for all to authenticated 
using (true) 
with check (true);

-- 4. Security & Login Audit Log Table
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(), 
  created_at timestamptz default now(), 
  username text, 
  status text, 
  ip text, 
  city text, 
  region text, 
  country text, 
  isp text, 
  timezone text, 
  os text, 
  os_version text, 
  browser text, 
  device_type text, 
  device_model text, 
  screen text, 
  language text, 
  public_pc boolean, 
  user_agent text
);

alter table public.audit_log enable row level security;
drop policy if exists "audit_ins" on public.audit_log; 
drop policy if exists "audit_sel" on public.audit_log; 
drop policy if exists "audit_del" on public.audit_log;

create policy "audit_ins" on public.audit_log 
for insert to anon, authenticated 
with check (true);

create policy "audit_sel" on public.audit_log 
for select to authenticated 
using (true);

create policy "audit_del" on public.audit_log 
for delete to authenticated 
using (true);

-- 5. Contact Form Submissions Table (Portfolio Main Site)
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  source text default 'portfolio_website'
);

alter table public.contact_submissions enable row level security;
drop policy if exists "contact_ins_anon" on public.contact_submissions;
drop policy if exists "contact_sel_auth" on public.contact_submissions;

create policy "contact_ins_anon" on public.contact_submissions 
for insert to anon, authenticated 
with check (true);

create policy "contact_sel_auth" on public.contact_submissions 
for select to authenticated 
using (true);

-- 6. Enable Supabase Realtime for Tables
alter publication supabase_realtime add table public.admin_notes, public.vault_files;
