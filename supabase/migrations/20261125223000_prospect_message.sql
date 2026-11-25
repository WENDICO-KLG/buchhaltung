-- Reply text of a lead (filled by the daily Instantly sync). Additive only; "notes" stays for manual text.
alter table public.prospects add column if not exists message text;
alter table public.prospects add column if not exists message_at timestamptz;
