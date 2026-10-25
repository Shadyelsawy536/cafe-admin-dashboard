-- HubDine Dine In + QR foundation.
-- Existing orders are marked "unknown" because their original channel cannot be
-- inferred safely from historical records. New website orders default to website.
begin;

alter table public.restaurant_settings
  add column if not exists accepts_dine_in boolean not null default false,
  add column if not exists qr_primary_color text not null default '#111827',
  add column if not exists qr_background_color text not null default '#FFFFFF',
  add column if not exists qr_accent_color text not null default '#D4AF37',
  add column if not exists qr_title text not null default 'Scan to order',
  add column if not exists qr_design text not null default 'classic';

alter table public.orders
  add column if not exists order_source text,
  add column if not exists table_id uuid,
  add column if not exists table_number_snapshot text;

update public.orders
set order_source = 'unknown'
where order_source is null;

alter table public.orders
  alter column order_source set default 'website',
  alter column order_source set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_order_source_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_order_source_check
      check (order_source in ('unknown', 'website', 'app', 'qr_table'));
  end if;
end $$;

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  branch_id uuid not null,
  table_number text not null,
  display_name text,
  qr_token uuid not null default gen_random_uuid() unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_tables_branch_restaurant_fkey
    foreign key (branch_id, restaurant_id)
    references public.restaurant_locations(id, restaurant_id) on delete cascade,
  constraint restaurant_tables_number_nonempty check (length(trim(table_number)) > 0),
  constraint restaurant_tables_number_unique_per_branch unique (restaurant_id, branch_id, table_number),
  constraint restaurant_tables_id_restaurant_unique unique (id, restaurant_id)
);

alter table public.orders
  add constraint orders_table_restaurant_fkey
  foreign key (table_id, restaurant_id)
  references public.restaurant_tables(id, restaurant_id)
  on delete set null (table_id);

create index if not exists restaurant_tables_tenant_branch_idx
  on public.restaurant_tables (restaurant_id, branch_id, is_active);
create index if not exists orders_tenant_source_created_idx
  on public.orders (restaurant_id, order_source, created_at desc);

alter table public.restaurant_tables enable row level security;

drop policy if exists "Restaurant staff manage their tables" on public.restaurant_tables;
create policy "Restaurant staff manage their tables"
  on public.restaurant_tables
  for all
  to authenticated
  using (private.is_restaurant_staff(restaurant_id))
  with check (private.is_restaurant_staff(restaurant_id));

-- Table rows and QR tokens are intentionally NOT readable by anon users.
-- Public QR resolution/order creation must go through a narrowly scoped RPC,
-- added in the next backend step, so the browser cannot enumerate table tokens.

commit;
