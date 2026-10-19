begin;

alter table public.company_members drop constraint member_pages_valid;
alter table public.company_members add constraint member_pages_valid check (
  allowed_pages <@ array['dashboard','todos','analytics','cvs','customers','prospects','profile','calculator','social-media']::text[]
);

create or replace function public.set_member_pages(company uuid, member uuid, pages text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.companies where id = company for update;
  if coalesce(public.company_role(company),'') not in ('owner','admin') then raise exception 'Keine Berechtigung.'; end if;
  if not exists(select 1 from public.company_members where company_id = company and user_id = member and role in ('member','viewer')) then raise exception 'Nur Mitarbeiter und Leser haben konfigurierbare Seiten.'; end if;
  if pages is null or not pages <@ array['dashboard','todos','analytics','cvs','customers','prospects','profile','calculator','social-media']::text[] then raise exception 'Ungueltige Seiten.'; end if;
  update public.company_members set allowed_pages = pages where company_id = company and user_id = member;
end;
$$;

create table public.social_media_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.companies(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  post_url text not null check (length(post_url) <= 2048 and post_url ~ '^https?://[^[:space:]]+\.[^[:space:]]+'),
  service_date date not null check (service_date between date '1900-01-01' and date '9999-12-31'),
  amount numeric(12,2) not null check (amount >= 0 and amount <= 9999999.99),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index social_media_orders_company_date on public.social_media_orders(user_id, service_date desc);
alter table public.social_media_orders enable row level security;
revoke all on public.social_media_orders from public, anon, authenticated;
grant select, insert, update, delete on public.social_media_orders to authenticated;

create policy social_media_read on public.social_media_orders for select to authenticated
  using (public.company_has_page(user_id, 'social-media'));
create policy social_media_insert on public.social_media_orders for insert to authenticated
  with check (public.company_has_page(user_id, 'social-media') and public.company_role(user_id) in ('owner','admin','member'));
create policy social_media_update on public.social_media_orders for update to authenticated
  using (public.company_has_page(user_id, 'social-media') and public.company_role(user_id) in ('owner','admin','member'))
  with check (public.company_has_page(user_id, 'social-media') and public.company_role(user_id) in ('owner','admin','member'));
create policy social_media_delete on public.social_media_orders for delete to authenticated
  using (public.company_has_page(user_id, 'social-media') and public.company_role(user_id) in ('owner','admin','member'));

create function public.guard_social_media_order() returns trigger
language plpgsql security definer set search_path = '' as $$
declare manages boolean;
begin
  if TG_OP = 'DELETE' then
    if old.paid_at is not null and coalesce(public.company_role(old.user_id),'') not in ('owner','admin') then
      raise exception 'Bezahlte Auftraege koennen nur Administratoren loeschen.';
    end if;
    return old;
  end if;
  manages := coalesce(public.company_role(new.user_id),'') in ('owner','admin');
  if TG_OP = 'UPDATE' then
    if new.user_id is distinct from old.user_id or new.id is distinct from old.id then raise exception 'Auftragszuordnung darf nicht geaendert werden.'; end if;
    if not manages and (old.paid_at is not null or new.paid_at is distinct from old.paid_at) then
      raise exception 'Nur Administratoren duerfen Zahlungen und bezahlte Auftraege aendern.';
    end if;
    new.created_at := old.created_at;
  elsif not manages and new.paid_at is not null then
    raise exception 'Nur Administratoren duerfen Zahlungen bestaetigen.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger guard_social_media_order before insert or update or delete on public.social_media_orders
  for each row execute function public.guard_social_media_order();
revoke all on function public.guard_social_media_order() from public, anon, authenticated;

commit;