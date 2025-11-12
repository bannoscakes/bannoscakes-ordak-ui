-- Ensure messaging table schema matches RPC expectations
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Backfill missing sender names from staff records
UPDATE public.messages m
SET sender_name = s.full_name
FROM public.staff_shared s
WHERE m.sender_name IS NULL
  AND m.sender_id = s.user_id;
