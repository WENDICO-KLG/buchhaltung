create table if not exists public.todos (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  due_date date,
  customer_id text references public.customers(id) on delete set null,
  prospect_id text references public.prospects(id) on delete set null,
  created_at date not null,
  updated_at date not null
);

alter table public.todos enable row level security;
drop policy if exists "users manage own todos" on public.todos;
create policy "users manage own todos" on public.todos for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists todos_user_due_date_idx on public.todos (user_id, due_date);
create index if not exists todos_user_status_idx on public.todos (user_id, status);

create or replace function public.due_notifications()
returns table (user_id uuid, item_id text, title text, body text, href text)
language sql
stable
security definer
set search_path = ''
as $$
  select i.user_id, 'invoice-' || i.id, 'Rechnung ' || i.invoice_number,
    i.customer_name || ' · fällig ' || to_char(i.due_date, 'DD.MM.YYYY'), '/applications/' || i.id
  from public.invoices i
  where i.status in ('sent', 'overdue') and i.due_date <= current_date
  union all
  select p.user_id, 'prospect-' || p.id, p.next_task,
    p.company_name || ' · fällig ' || to_char(p.next_task_at, 'DD.MM.YYYY'), '/prospects'
  from public.prospects p
  where p.next_task is not null and p.next_task_at <= current_date and p.status not in ('won', 'lost')
  union all
  select w.user_id, 'workspace-' || w.id, w.title,
    initcap(w.module) || ' · fällig ' || to_char(w.due_date, 'DD.MM.YYYY'), '/workspace/' || w.module
  from public.workspace_items w
  where w.due_date <= current_date and w.status not in ('Erledigt', 'Abgeschlossen', 'Bezahlt', 'Gewonnen', 'Archiviert', 'Angenommen', 'Abgelehnt', 'Verloren', 'Storniert', 'Ehemalig')
  union all
  select t.user_id, 'todo-' || t.id, t.title,
    'To-Do · fällig ' || to_char(t.due_date, 'DD.MM.YYYY'), '/todos'
  from public.todos t
  where t.due_date is not null and t.due_date <= current_date and t.status <> 'done';
$$;

revoke all on function public.due_notifications() from public, anon, authenticated;
grant execute on function public.due_notifications() to service_role;
