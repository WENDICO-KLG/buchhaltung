begin;

alter table public.todos add column priority text not null default 'normal'
  check (priority in ('high', 'normal', 'low'));

commit;