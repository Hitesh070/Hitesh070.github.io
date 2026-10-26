-- =========================================================================
-- Supabase Setup Script for Admin Portal
-- Run this once in your Supabase Project's SQL Editor (supabase.com -> SQL Editor)
-- =========================================================================

-- 1. Private Storage Bucket for Temp Cloud Staging Vault
insert into storage.buckets (id, name, public) 
values ('temp_vault', 'temp_vault', false) 
on conflict (id) do nothing;

create policy "vault_all_auth" on storage.objects 
for all to authenticated 
using (bucket_id = 'temp_vault') 
with check (bucket_id = 'temp_vault');

-- 2. Cloud Admin Scratchpad Table with Row Level Security
create table if not exists public.admin_notes (
  id text primary key, 
  content text not null default '', 
  updated_at timestamptz not null default now()
);

alter table public.admin_notes enable row level security;

create policy "notes_auth" on public.admin_notes 
for all to authenticated 
using (true) 
with check (true);

-- 3. Security & Login Audit Log Table with Geo & Device Telemetry
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

-- Allow logging failed or unauthenticated login attempts via anon key
create policy "audit_insert_anon" on public.audit_log 
for insert to anon, authenticated 
with check (true);

-- Allow reading audit logs only to authenticated admin users
create policy "audit_read_auth" on public.audit_log 
for select to authenticated 
using (true);

-- Allow clearing/deleting audit logs only to authenticated admin users
create policy "audit_delete_auth" on public.audit_log 
for delete to authenticated 
using (true);
