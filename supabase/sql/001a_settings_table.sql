-- 001a_settings_table.sql — required by RLS feature flag
create table if not exists settings (
  store text not null,
  key   text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (store, key)
);
