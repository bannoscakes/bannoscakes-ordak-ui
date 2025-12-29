-- Add orders tables to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders_bannos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders_flourlane;
