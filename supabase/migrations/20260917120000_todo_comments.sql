create table if not exists public.todo_comments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  todo_id text not null references public.todos(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.todo_comments enable row level security;
drop policy if exists "users manage own todo comments" on public.todo_comments;
create policy "users manage own todo comments" on public.todo_comments for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists todo_comments_todo_id_idx on public.todo_comments (todo_id, created_at);
