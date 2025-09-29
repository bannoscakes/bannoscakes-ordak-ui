create or replace view public.orders_bannos    as select * from public.orders where store='bannos'    with local check option;
create or replace view public.orders_flourlane as select * from public.orders where store='flourlane' with local check option;
