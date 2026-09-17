alter table public.customers add column if not exists logo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('customer-logos', 'customer-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can view customer logos" on storage.objects;
create policy "public can view customer logos" on storage.objects for select to public
using (bucket_id = 'customer-logos');

drop policy if exists "users manage own customer logos" on storage.objects;
create policy "users manage own customer logos" on storage.objects for all to authenticated
using (bucket_id = 'customer-logos' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'customer-logos' and auth.uid()::text = (storage.foldername(name))[1]);
