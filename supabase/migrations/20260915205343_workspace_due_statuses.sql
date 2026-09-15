create or replace function public.due_notifications()
returns table (user_id uuid, item_id text, title text, body text, href text)
language sql stable security definer set search_path = '' as $$
	select i.user_id, 'invoice-' || i.id, 'Rechnung ' || i.invoice_number, i.customer_name || ' · fällig ' || to_char(i.due_date, 'DD.MM.YYYY'), '/applications/' || i.id
	from public.invoices i where i.status in ('sent', 'overdue') and i.due_date <= current_date
	union all
	select p.user_id, 'prospect-' || p.id, p.next_task, p.company_name || ' · fällig ' || to_char(p.next_task_at, 'DD.MM.YYYY'), '/prospects'
	from public.prospects p where p.next_task is not null and p.next_task_at <= current_date and p.status not in ('won', 'lost')
	union all
	select w.user_id, 'workspace-' || w.id, w.title, initcap(w.module) || ' · fällig ' || to_char(w.due_date, 'DD.MM.YYYY'), '/workspace/' || w.module
	from public.workspace_items w where w.due_date <= current_date and w.status not in ('Erledigt', 'Abgeschlossen', 'Bezahlt', 'Gewonnen', 'Archiviert', 'Angenommen', 'Abgelehnt', 'Verloren', 'Storniert', 'Ehemalig');
$$;

revoke all on function public.due_notifications() from public, anon, authenticated;
grant execute on function public.due_notifications() to service_role;
