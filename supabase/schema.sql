create table if not exists public.applications (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  company text not null,
  position text not null,
  location text,
  job_url text,
  source text,
  category text not null,
  salary_min numeric,
  salary_max numeric,
  currency text,
  deadline date,
  status text not null,
  match_score numeric,
  applied_at date,
  created_at date not null,
  updated_at date not null,
  cv_type text,
  job_description text,
  notes text
);

create table if not exists public.profiles (
  id text primary key,
  user_id uuid unique references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  location text,
  website text,
  linkedin text
);

create table if not exists public.cvs (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  description text not null,
  updated_at date not null,
  status text not null,
  file_name text,
  storage_path text,
  file_type text,
  file_size bigint
);

alter table public.cvs add column if not exists file_name text;
alter table public.cvs add column if not exists storage_path text;
alter table public.cvs add column if not exists file_type text;
alter table public.cvs add column if not exists file_size bigint;

alter table public.applications add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.profiles add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.cvs add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.applications enable row level security;
alter table public.profiles enable row level security;
alter table public.cvs enable row level security;

drop policy if exists "local prototype applications access" on public.applications;
drop policy if exists "local prototype profiles access" on public.profiles;
drop policy if exists "local prototype cvs access" on public.cvs;
drop policy if exists "authenticated users own applications" on public.applications;
drop policy if exists "authenticated users own profiles" on public.profiles;
drop policy if exists "authenticated users own cvs" on public.cvs;
create policy "authenticated users own applications" on public.applications for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "authenticated users own profiles" on public.profiles for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "authenticated users own cvs" on public.cvs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('cvs', 'cvs', false) on conflict (id) do nothing;
drop policy if exists "authenticated users manage cv files" on storage.objects;
create policy "authenticated users manage cv files" on storage.objects for all to authenticated using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);
