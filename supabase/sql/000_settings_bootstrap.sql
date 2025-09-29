create table if not exists public.settings (
  store text not null,
  key   text not null,
  value jsonb,
  constraint settings_pkey primary key (store, key)
);
create or replace function public.settings_get_bool(ns text, k text, default_value boolean)
returns boolean language sql stable as $$
  select coalesce((
    select case
             when jsonb_typeof(s.value) = 'boolean' then (s.value)::boolean
             when jsonb_typeof(s.value) is null     then default_value
             else case when lower(trim(both '"' from (s.value)::text)) in ('1','true','yes','on')
                       then true else false end
           end
    from public.settings s
    where s.store = ns and s.key = k
    limit 1
  ), default_value);
$$;
