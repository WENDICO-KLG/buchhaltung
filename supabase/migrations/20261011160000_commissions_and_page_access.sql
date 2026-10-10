begin;

alter table public.company_members add column allowed_pages text[] not null
  default array['dashboard','todos','analytics','cvs','customers','prospects','profile','calculator'];
alter table public.company_members add constraint member_pages_valid check (
  allowed_pages <@ array['dashboard','todos','analytics','cvs','customers','prospects','profile','calculator']::text[]
);
alter table public.customers add column commission_enabled boolean not null default false;

create function public.company_has_page(company uuid, page_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('owner','admin') or page_name = any(allowed_pages)
    from public.company_members where company_id = company and user_id = auth.uid()), false);
$$;

drop function public.my_companies();
create function public.my_companies()
returns table(company_id uuid, company_name text, role text, allowed_pages text[])
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, m.role, m.allowed_pages from public.company_members m
  join public.companies c on c.id = m.company_id where m.user_id = auth.uid() order by m.created_at, c.id;
$$;
drop function public.company_team(uuid);
create function public.company_team(company uuid)
returns table(user_id uuid, email text, role text, display_name text, allowed_pages text[])
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.company_role(company) is null then raise exception 'Kein Firmenzugriff.'; end if;
  return query select m.user_id, u.email::text, m.role, m.display_name, m.allowed_pages
    from public.company_members m join auth.users u on u.id = m.user_id where m.company_id = company order by m.created_at, m.user_id;
end;
$$;
create function public.set_member_pages(company uuid, member uuid, pages text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.companies where id = company for update;
  if coalesce(public.company_role(company),'') not in ('owner','admin') then raise exception 'Keine Berechtigung.'; end if;
  if not exists(select 1 from public.company_members where company_id = company and user_id = member and role in ('member','viewer')) then raise exception 'Nur Mitarbeiter und Leser haben konfigurierbare Seiten.'; end if;
  if pages is null or not pages <@ array['dashboard','todos','analytics','cvs','customers','prospects','profile','calculator']::text[] then raise exception 'Ungueltige Seiten.'; end if;
  update public.company_members set allowed_pages = pages where company_id = company and user_id = member;
end;
$$;

do $$
declare target text; page_name text; read_rule text; write_rule text;
begin
  foreach target in array array['invoices','expenses','documents','customers','prospects','todos','todo_comments','monthly_goals','company_profiles','workspace_items','workspace_files'] loop
    page_name := case target when 'invoices' then 'dashboard' when 'expenses' then 'analytics' when 'documents' then 'cvs'
      when 'customers' then 'customers' when 'prospects' then 'prospects' when 'todos' then 'todos' when 'todo_comments' then 'todos'
      when 'monthly_goals' then 'dashboard' when 'company_profiles' then 'profile' else 'removed_workspace' end;
    write_rule := format('public.company_has_page(user_id, %L)', page_name);
    read_rule := write_rule;
    if target in ('customers','expenses') then read_rule := '(' || read_rule || ' or public.company_has_page(user_id, ''dashboard''))'; end if;
    execute format('create policy page_read on public.%I as restrictive for select to authenticated using (%s)', target, read_rule);
    execute format('create policy page_insert on public.%I as restrictive for insert to authenticated with check (%s)', target, write_rule);
    execute format('create policy page_update on public.%I as restrictive for update to authenticated using (%s) with check (%s)', target, write_rule, write_rule);
    execute format('create policy page_delete on public.%I as restrictive for delete to authenticated using (%s)', target, write_rule);
  end loop;
end;
$$;

create policy page_file_access on storage.objects as restrictive for all to authenticated
using (public.company_has_page(nullif(split_part(name,'/',1),'')::uuid,
  case bucket_id when 'documents' then 'cvs' when 'customer-logos' then 'customers' else 'removed_workspace' end))
with check (public.company_has_page(nullif(split_part(name,'/',1),'')::uuid,
  case bucket_id when 'documents' then 'cvs' when 'customer-logos' then 'customers' else 'removed_workspace' end));

create table public.customer_commissions (
  customer_id text primary key references public.customers(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  member_id uuid,
  rate numeric(5,2) not null default 0 check (rate between 0 and 100),
  foreign key(company_id, member_id) references public.company_members(company_id,user_id) on delete set null(member_id)
);
alter table public.customer_commissions enable row level security;
revoke all on public.customer_commissions from public, anon, authenticated;

create function public.commission_customers(company uuid)
returns table(customer_id text, company_name text, amount numeric, payment_date date, member_id uuid, member_name text, rate numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.company_has_page(company,'calculator') then raise exception 'Kein Zugriff auf den Rechner.'; end if;
  return query select c.id,c.company_name,c.one_time_revenue,c.one_time_revenue_date,a.member_id,
    coalesce(m.display_name,u.email::text),coalesce(a.rate,0::numeric)
    from public.customers c left join public.customer_commissions a on a.customer_id = c.id and a.company_id = c.user_id
    left join public.company_members m on m.company_id = c.user_id and m.user_id = a.member_id
    left join auth.users u on u.id = m.user_id
    where c.user_id = company and c.commission_enabled and
      (public.company_role(company) in ('owner','admin') or a.member_id = auth.uid()) order by c.company_name,c.id;
end;
$$;

create function public.set_customer_commission(company uuid, customer text, member uuid, percentage numeric) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.companies where id = company for update;
  if coalesce(public.company_role(company),'') not in ('owner','admin') then raise exception 'Keine Berechtigung zur Provisionszuordnung.'; end if;
  perform 1 from public.customers where id = customer and user_id = company and commission_enabled for update;
  if not found then raise exception 'Der Kunde ist nicht fuer Provision aktiviert.'; end if;
  if member is not null and not exists(select 1 from public.company_members where company_id = company and user_id = member and role <> 'viewer') then raise exception 'Kein aktiver Mitarbeiter dieser Firma.'; end if;
  if percentage is null or percentage < 0 or percentage > 100 or percentage = 'NaN'::numeric then raise exception 'Prozent muss zwischen 0 und 100 liegen.'; end if;
  insert into public.customer_commissions(customer_id,company_id,member_id,rate) values(customer,company,member,percentage)
  on conflict(customer_id) do update set member_id = excluded.member_id,rate = excluded.rate;
end;
$$;

create function public.guard_customer_commission() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (TG_OP = 'INSERT' and new.commission_enabled) or (TG_OP = 'UPDATE' and new.commission_enabled is distinct from old.commission_enabled) then
    if coalesce(public.company_role(new.user_id),'') not in ('owner','admin') then raise exception 'Nur Administratoren verwalten die Provisionsfreigabe.'; end if;
  end if;
  if not new.commission_enabled then delete from public.customer_commissions where customer_id = new.id; end if;
  return new;
end;
$$;
create trigger guard_customer_commission before insert or update on public.customers for each row execute function public.guard_customer_commission();
revoke all on function public.guard_customer_commission() from public,anon,authenticated;
revoke all on function public.company_has_page(uuid,text),public.my_companies(),public.company_team(uuid),public.set_member_pages(uuid,uuid,text[]),public.commission_customers(uuid),public.set_customer_commission(uuid,text,uuid,numeric) from public,anon,authenticated;
grant execute on function public.company_has_page(uuid,text),public.my_companies(),public.company_team(uuid),public.set_member_pages(uuid,uuid,text[]),public.commission_customers(uuid),public.set_customer_commission(uuid,text,uuid,numeric) to authenticated;

commit;