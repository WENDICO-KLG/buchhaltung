alter table public.customers add column if not exists billing_interval text not null default 'monthly';
alter table public.customers drop constraint if exists customers_billing_interval_check;
alter table public.customers add constraint customers_billing_interval_check check (billing_interval in ('monthly', 'yearly'));
alter table public.customers add column if not exists one_time_revenue_date date;

alter table public.invoices add column if not exists covers_recurring boolean not null default false;
