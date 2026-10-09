alter table public.customers add column if not exists monthly_start_date date;
alter table public.customers add column if not exists monthly_end_date date;
alter table public.customers drop constraint if exists customers_monthly_date_range_check;
alter table public.customers add constraint customers_monthly_date_range_check check (monthly_end_date is null or monthly_start_date is null or monthly_end_date >= monthly_start_date);
