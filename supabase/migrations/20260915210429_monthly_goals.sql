create table if not exists public.monthly_goals (
	id text primary key,
	user_id uuid not null references auth.users(id) on delete cascade,
	month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
	revenue_target numeric(12,2) not null default 0 check (revenue_target >= 0),
	recurring_revenue_target numeric(12,2) not null default 0 check (recurring_revenue_target >= 0),
	expense_budget numeric(12,2) not null default 0 check (expense_budget >= 0),
	notes text,
	created_at date not null,
	updated_at date not null,
	unique (user_id, month)
);

alter table public.monthly_goals enable row level security;
drop policy if exists "users manage own monthly goals" on public.monthly_goals;
create policy "users manage own monthly goals" on public.monthly_goals for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists monthly_goals_user_month_idx on public.monthly_goals (user_id, month desc);
