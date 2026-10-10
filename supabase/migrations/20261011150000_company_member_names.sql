begin;

alter table public.company_members add column display_name text
  check (display_name is null or char_length(trim(display_name)) between 1 and 100);

drop function public.company_team(uuid);
create function public.company_team(company uuid)
returns table(user_id uuid, email text, role text, display_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.company_role(company) is null then raise exception 'Kein Zugriff auf diese Firma.'; end if;
  return query select m.user_id, u.email::text, m.role, m.display_name
  from public.company_members m join auth.users u on u.id = m.user_id
  where m.company_id = company order by m.created_at, m.user_id;
end;
$$;

create function public.set_company_member_name(company uuid, member uuid, member_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare actor_role text; target_role text;
begin
  perform 1 from public.companies where id = company for update;
  actor_role := public.company_role(company);
  select role into target_role from public.company_members where company_id = company and user_id = member;
  if coalesce(actor_role, '') not in ('owner', 'admin') or target_role is null
    or (actor_role = 'admin' and target_role in ('owner', 'admin') and member <> auth.uid()) then
    raise exception 'Keine Berechtigung zum Aendern dieses Namens.';
  end if;
  if char_length(trim(member_name)) > 100 then raise exception 'Der Name darf maximal 100 Zeichen enthalten.'; end if;
  update public.company_members set display_name = nullif(trim(member_name), '')
  where company_id = company and user_id = member;
end;
$$;

revoke all on function public.company_team(uuid), public.set_company_member_name(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.company_team(uuid), public.set_company_member_name(uuid, uuid, text) to authenticated;

commit;