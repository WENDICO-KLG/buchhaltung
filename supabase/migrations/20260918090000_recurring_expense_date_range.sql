alter table public.expenses add column if not exists recurring_start_date date;
alter table public.expenses add column if not exists recurring_end_date date;
