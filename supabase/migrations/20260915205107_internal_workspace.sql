create table if not exists public.workspace_items (
	id text primary key,
	user_id uuid not null references auth.users(id) on delete cascade,
	module text not null check (module in ('projects', 'ideas', 'tasks', 'offers', 'people', 'commissions', 'leads', 'operations')),
	title text not null check (char_length(title) between 1 and 200),
	subtitle text,
	description text,
	status text not null,
	priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
	owner text,
	contact_name text,
	email text,
	phone text,
	amount numeric(12,2) check (amount is null or amount >= 0),
	start_date date,
	due_date date,
	tags text[] not null default '{}',
	created_at date not null,
	updated_at date not null
);

create table if not exists public.workspace_files (
	id text primary key,
	user_id uuid not null references auth.users(id) on delete cascade,
	item_id text not null references public.workspace_items(id) on delete cascade,
	name text not null,
	storage_path text not null unique,
	file_type text,
	file_size bigint,
	created_at date not null
);

alter table public.workspace_items enable row level security;
alter table public.workspace_files enable row level security;

drop policy if exists "users manage own workspace items" on public.workspace_items;
drop policy if exists "users manage own workspace files" on public.workspace_files;
create policy "users manage own workspace items" on public.workspace_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own workspace files" on public.workspace_files for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workspace-files', 'workspace-files', false, 15728640, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users manage own workspace objects" on storage.objects;
create policy "users manage own workspace objects" on storage.objects for all to authenticated
using (bucket_id = 'workspace-files' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'workspace-files' and auth.uid()::text = (storage.foldername(name))[1]);

create index if not exists workspace_items_user_module_idx on public.workspace_items (user_id, module, updated_at desc);
create index if not exists workspace_files_item_id_idx on public.workspace_files (item_id);

