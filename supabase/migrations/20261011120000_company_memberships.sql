begin;

create table public.companies (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  created_at timestamptz not null default now()
);
create table public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id),
  check ((role = 'owner') = (company_id = user_id))
);
create index company_members_user_idx on public.company_members(user_id);
create table public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member', 'viewer')),
  expires_at timestamptz not null default now() + interval '7 days',
  unique (company_id, email)
);
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_invitations enable row level security;
revoke all on public.companies, public.company_members, public.company_invitations from anon, authenticated;

insert into public.companies(id, name)
select u.id, coalesce(p.company_name, 'Meine Firma')
from auth.users u left join public.company_profiles p on p.user_id = u.id;
insert into public.company_members(company_id, user_id, role)
select id, id, 'owner' from public.companies;

create function public.company_role(company uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.company_members where company_id = company and user_id = auth.uid();
$$;
create function public.my_companies()
returns table(company_id uuid, company_name text, role text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, m.role from public.company_members m
  join public.companies c on c.id = m.company_id
  where m.user_id = auth.uid() order by m.created_at, c.id;
$$;
create function public.create_company(company_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Du musst angemeldet sein.'; end if;
  if char_length(trim(company_name)) not between 1 and 200 then raise exception 'Bitte gib einen Firmennamen ein (maximal 200 Zeichen).'; end if;
  if exists(select 1 from public.companies where id = auth.uid()) then raise exception 'Du hast bereits eine eigene Firma.'; end if;
  insert into public.companies(id, name) values(auth.uid(), trim(company_name));
  insert into public.company_members(company_id, user_id, role) values(auth.uid(), auth.uid(), 'owner');
  return auth.uid();
end;
$$;
create function public.company_team(company uuid)
returns table(user_id uuid, email text, role text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.company_role(company) is null then raise exception 'Kein Zugriff auf diese Firma.'; end if;
  return query select m.user_id, u.email::text, m.role from public.company_members m
  join auth.users u on u.id = m.user_id where m.company_id = company order by m.created_at, m.user_id;
end;
$$;
create function public.company_pending_invitations(company uuid)
returns table(id uuid, company_id uuid, company_name text, email text, role text, expires_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.company_role(company), '') not in ('owner', 'admin') then raise exception 'Keine Berechtigung zur Teamverwaltung.'; end if;
  return query select i.id, i.company_id, c.name, i.email, i.role, i.expires_at
  from public.company_invitations i join public.companies c on c.id = i.company_id
  where i.company_id = company and i.expires_at > now() order by i.email;
end;
$$;
create function public.my_company_invitations()
returns table(id uuid, company_id uuid, company_name text, email text, role text, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.company_id, c.name, i.email, i.role, i.expires_at
  from public.company_invitations i join public.companies c on c.id = i.company_id
  join auth.users u on u.id = auth.uid() and lower(u.email) = i.email and u.email_confirmed_at is not null
  where i.expires_at > now() order by i.expires_at;
$$;
create function public.invite_company_member(company uuid, invited_email text, invited_role text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invitation_id uuid; actor_role text;
begin
  perform 1 from public.companies where id = company for update;
  actor_role := public.company_role(company);
  if coalesce(actor_role, '') not in ('owner', 'admin') then raise exception 'Keine Berechtigung zur Teamverwaltung.'; end if;
  if invited_role not in ('admin', 'member', 'viewer') or invited_role is null then raise exception 'Ungueltige Rolle.'; end if;
  if invited_role = 'admin' and actor_role <> 'owner' then raise exception 'Nur Inhaber duerfen Administratoren ernennen.'; end if;
  if invited_email is null or char_length(trim(invited_email)) > 254 or trim(invited_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Ungueltige E-Mail-Adresse.'; end if;
  if exists(select 1 from public.company_members m join auth.users u on u.id = m.user_id where m.company_id = company and lower(u.email) = lower(trim(invited_email))) then raise exception 'Dieser Benutzer ist bereits Mitglied.'; end if;
  if actor_role = 'admin' and exists(select 1 from public.company_invitations where company_id = company and email = lower(trim(invited_email)) and role = 'admin') then raise exception 'Nur Inhaber duerfen Administrator-Einladungen bearbeiten.'; end if;
  insert into public.company_invitations(company_id, email, role)
  values(company, lower(trim(invited_email)), invited_role)
  on conflict (company_id, email) do update set role = excluded.role, expires_at = now() + interval '7 days'
  returning id into invitation_id;
  return invitation_id;
end;
$$;
create function public.accept_company_invitation(invitation uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invite public.company_invitations;
begin
  select * into invite from public.company_invitations where id = invitation for update;
  if not found or invite.expires_at <= now() or not exists(
    select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null and lower(email) = invite.email
  ) then raise exception 'Die Einladung ist ungueltig, abgelaufen oder gehoert nicht zu deiner bestaetigten E-Mail-Adresse.'; end if;
  insert into public.company_members(company_id, user_id, role) values(invite.company_id, auth.uid(), invite.role)
  on conflict (company_id, user_id) do nothing;
  delete from public.company_invitations where id = invitation;
  return invite.company_id;
end;
$$;
create function public.revoke_company_invitation(invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare invite public.company_invitations; actor_role text;
begin
  select * into invite from public.company_invitations where id = invitation for update;
  actor_role := public.company_role(invite.company_id);
  if coalesce(actor_role, '') not in ('owner', 'admin') or (invite.role = 'admin' and actor_role <> 'owner') then raise exception 'Keine Berechtigung fuer diese Einladung.'; end if;
  delete from public.company_invitations where id = invitation;
end;
$$;
create function public.set_company_member_role(company uuid, member uuid, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare target_role text; actor_role text;
begin
  perform 1 from public.companies where id = company for update;
  actor_role := public.company_role(company);
  select role into target_role from public.company_members where company_id = company and user_id = member;
  if coalesce(actor_role, '') not in ('owner', 'admin') or target_role is null or target_role = 'owner'
    or (actor_role = 'admin' and (target_role = 'admin' or new_role = 'admin')) then raise exception 'Keine Berechtigung fuer diese Rollenanderung.'; end if;
  if new_role is null or new_role not in ('admin', 'member', 'viewer') then raise exception 'Ungueltige Rolle.'; end if;
  update public.company_members set role = new_role where company_id = company and user_id = member;
end;
$$;
create function public.remove_company_member(company uuid, member uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare target_role text; actor_role text;
begin
  perform 1 from public.companies where id = company for update;
  actor_role := public.company_role(company);
  select role into target_role from public.company_members where company_id = company and user_id = member;
  if coalesce(actor_role, '') not in ('owner', 'admin') or target_role is null or target_role = 'owner'
    or (actor_role = 'admin' and target_role = 'admin') then raise exception 'Keine Berechtigung zum Entfernen dieses Mitglieds.'; end if;
  delete from public.company_members where company_id = company and user_id = member;
end;
$$;

create function public.guard_company_data() returns trigger
language plpgsql security definer set search_path = '' as $$
declare field text; linked_table text; linked_id text; linked_company uuid;
begin
  if TG_OP = 'UPDATE' and new.user_id is distinct from old.user_id then raise exception 'Die Firmenzuordnung darf nicht geaendert werden.'; end if;
  foreach field in array array['customer_id', 'prospect_id', 'document_id', 'todo_id', 'item_id'] loop
    linked_id := to_jsonb(new) ->> field;
    if linked_id is null then continue; end if;
    linked_table := case field when 'customer_id' then 'customers' when 'prospect_id' then 'prospects' when 'document_id' then 'documents' when 'todo_id' then 'todos' else 'workspace_items' end;
    execute format('select user_id from public.%I where id = $1', linked_table) into linked_company using linked_id;
    if linked_company is distinct from new.user_id then raise exception 'Verknuepfte Daten muessen zur selben Firma gehoeren.'; end if;
  end loop;
  if TG_TABLE_NAME in ('documents', 'workspace_files') then
    if new.storage_path is not null and split_part(new.storage_path, '/', 1) <> new.user_id::text then raise exception 'Die Datei gehoert nicht zu dieser Firma.'; end if;
  end if;
  if TG_TABLE_NAME = 'company_profiles' then
    update public.companies set name = new.company_name where id = new.user_id;
  end if;
  return new;
end;
$$;

do $$
declare target text; policy record; writable_roles text;
begin
  foreach target in array array['invoices', 'expenses', 'documents', 'company_profiles', 'customers', 'prospects', 'workspace_items', 'workspace_files', 'monthly_goals', 'todos', 'todo_comments'] loop
    for policy in select policyname from pg_policies where schemaname = 'public' and tablename = target loop
      execute format('drop policy %I on public.%I', policy.policyname, target);
    end loop;
    writable_roles := case when target = 'company_profiles' then '(''owner'', ''admin'')' else '(''owner'', ''admin'', ''member'')' end;
    execute format('create policy company_read on public.%I for select to authenticated using (public.company_role(user_id) is not null)', target);
    execute format('create policy company_insert on public.%I for insert to authenticated with check (public.company_role(user_id) in %s)', target, writable_roles);
    execute format('create policy company_update on public.%I for update to authenticated using (public.company_role(user_id) in %s) with check (public.company_role(user_id) in %s)', target, writable_roles, writable_roles);
    execute format('create policy company_delete on public.%I for delete to authenticated using (public.company_role(user_id) in %s)', target, writable_roles);
    execute format('create trigger guard_company_data before insert or update on public.%I for each row execute function public.guard_company_data()', target);
  end loop;
end;
$$;

create function public.company_storage_role(path text) returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.company_members m where m.company_id::text = split_part(path, '/', 1) and m.user_id = auth.uid();
$$;
drop policy if exists "users manage own accounting documents" on storage.objects;
drop policy if exists "users manage own workspace objects" on storage.objects;
drop policy if exists "users manage own customer logos" on storage.objects;
create policy company_file_read on storage.objects for select to authenticated
using (bucket_id in ('documents', 'workspace-files', 'customer-logos') and public.company_storage_role(name) is not null);
create policy company_file_insert on storage.objects for insert to authenticated
with check (bucket_id in ('documents', 'workspace-files', 'customer-logos') and public.company_storage_role(name) in ('owner', 'admin', 'member'));
create policy company_file_update on storage.objects for update to authenticated
using (bucket_id in ('documents', 'workspace-files', 'customer-logos') and public.company_storage_role(name) in ('owner', 'admin', 'member'))
with check (bucket_id in ('documents', 'workspace-files', 'customer-logos') and public.company_storage_role(name) in ('owner', 'admin', 'member'));
create policy company_file_delete on storage.objects for delete to authenticated
using (bucket_id in ('documents', 'workspace-files', 'customer-logos') and public.company_storage_role(name) in ('owner', 'admin', 'member'));

do $$
declare routine record;
begin
  for routine in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('company_role', 'my_companies', 'create_company', 'company_team', 'company_pending_invitations', 'my_company_invitations', 'invite_company_member', 'accept_company_invitation', 'revoke_company_invitation', 'set_company_member_role', 'remove_company_member', 'company_storage_role', 'guard_company_data') loop
    execute format('revoke all on function %s from public, anon, authenticated', routine.signature);
    if routine.signature::text not like '%guard_company_data%' then execute format('grant execute on function %s to authenticated', routine.signature); end if;
  end loop;
end;
$$;

commit;