alter table public.expenses add column if not exists customer_id text references public.customers(id) on delete set null;
create index if not exists expenses_customer_id_idx on public.expenses (customer_id);
