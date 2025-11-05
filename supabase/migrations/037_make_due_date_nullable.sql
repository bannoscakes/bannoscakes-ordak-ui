-- 037_make_due_date_nullable.sql
-- Make due_date nullable to support raw order storage
-- Orders will be processed later by backend using Liquid templates

-- Make due_date nullable in orders_bannos
alter table public.orders_bannos 
  alter column due_date drop not null;

-- Make due_date nullable in orders_flourlane
alter table public.orders_flourlane 
  alter column due_date drop not null;

-- Add comment explaining why
comment on column public.orders_bannos.due_date is 
  'Delivery/pickup date. NULL for raw orders awaiting backend processing.';

comment on column public.orders_flourlane.due_date is 
  'Delivery/pickup date. NULL for raw orders awaiting backend processing.';

