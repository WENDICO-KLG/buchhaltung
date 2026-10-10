begin;

update storage.buckets set public = false where id = 'customer-logos';
drop policy if exists "public can view customer logos" on storage.objects;

create function public.valid_push_endpoint(endpoint text) returns boolean
language sql immutable set search_path = '' as $$
  select endpoint is not null and char_length(endpoint) <= 2048
    and endpoint ~ '^https://(fcm\.googleapis\.com/fcm/send/|updates\.push\.services\.mozilla\.com/wpush/v2/|web\.push\.apple\.com/)[A-Za-z0-9_./%=-]+$';
$$;
alter table public.push_subscriptions add constraint push_endpoint_valid
  check (public.valid_push_endpoint(endpoint)) not valid;
alter table public.push_subscriptions add constraint push_keys_bounded
  check (char_length(p256dh) between 1 and 256 and char_length(auth) between 1 and 256) not valid;

create function public.guard_push_subscription() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from auth.users where id = new.user_id for update;
  if TG_OP = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'Die Abonnementzuordnung darf nicht geaendert werden.';
  end if;
  if TG_OP = 'INSERT' and (select count(*) from public.push_subscriptions where user_id = new.user_id) >= 10 then
    raise exception 'Maximal zehn Push-Abonnements pro Benutzer.';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_push_subscription() from public, anon, authenticated;
create trigger guard_push_subscription before insert or update on public.push_subscriptions
  for each row execute function public.guard_push_subscription();

create table public.agent_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  active_until timestamptz not null default now() + interval '3 minutes'
);
alter table public.agent_requests enable row level security;
revoke all on public.agent_requests from public, anon, authenticated;
create index agent_requests_company_time_idx on public.agent_requests(company_id, started_at);
create index agent_requests_actor_time_idx on public.agent_requests(actor_id, started_at);

create function public.acquire_agent_request(company uuid, actor uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare lease uuid;
begin
  perform 1 from auth.users where id = actor for update;
  perform 1 from public.companies where id = company for update;
  if not exists(select 1 from public.company_members where company_id = company and user_id = actor) then
    raise exception 'Kein Firmenzugriff.';
  end if;
  delete from public.agent_requests where started_at < now() - interval '2 days';
  if (select count(*) from public.agent_requests where actor_id = actor and started_at > now() - interval '1 minute') >= 6
    or (select count(*) from public.agent_requests where company_id = company and started_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC') >= 100
    or (select count(*) from public.agent_requests where company_id = company and active_until > now()) >= 3 then
    return null;
  end if;
  insert into public.agent_requests(company_id, actor_id) values(company, actor) returning id into lease;
  return lease;
end;
$$;
create function public.release_agent_request(lease uuid) returns void
language sql security definer set search_path = '' as $$
  update public.agent_requests set active_until = now() where id = lease;
$$;
revoke all on function public.acquire_agent_request(uuid, uuid), public.release_agent_request(uuid) from public, anon, authenticated;
grant execute on function public.acquire_agent_request(uuid, uuid), public.release_agent_request(uuid) to service_role;

commit;