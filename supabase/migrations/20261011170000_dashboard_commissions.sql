begin;

create function public.dashboard_commissions(company uuid)
returns table(payment_date date, total numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.company_has_page(company, 'dashboard') then
    raise exception 'Kein Zugriff auf die Uebersicht.';
  end if;
  return query
    with eligible as (
      select c.one_time_revenue_date as paid_on, c.one_time_revenue as amount,
        count(*) over (partition by a.member_id, date_trunc('month', c.one_time_revenue_date)) as closes
      from public.customers c
      join public.customer_commissions a on a.customer_id = c.id and a.company_id = c.user_id
      where c.user_id = company and c.commission_enabled and a.member_id is not null
        and c.one_time_revenue_date is not null and c.one_time_revenue > 0
    )
    select paid_on, sum(round(amount * 0.10, 2) +
      case when closes >= 3 then round(round(amount * 0.10, 2) * 0.50, 2) else 0 end)
    from eligible group by paid_on order by paid_on;
end;
$$;

revoke all on function public.dashboard_commissions(uuid) from public, anon, authenticated;
grant execute on function public.dashboard_commissions(uuid) to authenticated;

commit;