begin;

alter table public.todos add column assignee_id uuid;
alter table public.todos add constraint todos_assignee_membership_fkey
  foreign key (user_id, assignee_id)
  references public.company_members(company_id, user_id)
  on delete set null (assignee_id);

create index todos_company_assignee_idx on public.todos(user_id, assignee_id);

commit;