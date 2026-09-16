create or replace function public.valid_invoice_items(items jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
	select jsonb_typeof(items) = 'array'
		and jsonb_array_length(items) > 0
		and not exists (
			select 1 from jsonb_array_elements(items) item
			where coalesce((item ->> 'quantity')::numeric, 0) <= 0
				or coalesce((item ->> 'unitPrice')::numeric, -1) < 0
				or coalesce((item ->> 'vatRate')::numeric, -1) not between 0 and 100
				or char_length(trim(coalesce(item ->> 'description', ''))) = 0
		);
$$;

alter table public.invoices drop constraint if exists invoices_items_valid;
alter table public.invoices add constraint invoices_items_valid check (public.valid_invoice_items(items)) not valid;
