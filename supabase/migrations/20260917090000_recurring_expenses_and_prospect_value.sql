alter table public.expenses add column if not exists is_recurring boolean not null default false;
alter table public.expenses drop constraint if exists expenses_recurring_interval_check;
alter table public.expenses add column if not exists recurring_interval text;
alter table public.expenses add constraint expenses_recurring_interval_check check (recurring_interval in ('monthly', 'yearly'));

alter table public.prospects add column if not exists estimated_value numeric(12,2) check (estimated_value >= 0);
