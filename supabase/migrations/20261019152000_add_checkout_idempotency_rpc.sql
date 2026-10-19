-- Draft checkout idempotency for the Flutter location-aware checkout.
-- Apply to staging only first. This creates a new RPC; it does not alter existing RPC behavior.
begin;

create table if not exists private.order_idempotency_keys (
  user_id uuid not null,
  idempotency_key uuid not null,
  request_payload jsonb not null,
  order_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, idempotency_key)
);

revoke all on table private.order_idempotency_keys from public, anon, authenticated;

create or replace function public.place_order_with_location_idempotent(
  p_idempotency_key uuid,
  p_restaurant_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_type public.delivery_type,
  p_delivery_address text,
  p_pickup_branch text,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_coupon_code text default null,
  p_customer_notes text default '',
  p_scheduled_for timestamptz default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_request_payload jsonb;
  v_existing_payload jsonb;
  v_existing_order_id uuid;
  v_order_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to place an order';
  end if;

  if p_idempotency_key is null then
    raise exception 'An idempotency key is required';
  end if;

  if p_items is null or pg_catalog.jsonb_typeof(p_items) <> 'array'
     or pg_catalog.jsonb_array_length(p_items) = 0 then
    raise exception 'An order must contain at least one item';
  end if;

  if not exists (
    select 1
    from public.customers c
    where c.id = p_customer_id
      and c.user_id = v_user_id
      and c.restaurant_id = p_restaurant_id
  ) then
    raise exception 'Not authorized to place this order for this customer/restaurant';
  end if;

  v_request_payload := pg_catalog.jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'customer_id', p_customer_id,
    'customer_name', p_customer_name,
    'customer_phone', p_customer_phone,
    'delivery_type', p_delivery_type,
    'delivery_address', p_delivery_address,
    'pickup_branch', p_pickup_branch,
    'payment_method', p_payment_method,
    'items', p_items,
    'coupon_code', p_coupon_code,
    'customer_notes', p_customer_notes,
    'scheduled_for', p_scheduled_for,
    'latitude', p_latitude,
    'longitude', p_longitude
  );

  -- Serialize retries for the same user/key. Hash collisions only cause extra waiting,
  -- not incorrect deduplication; the table's primary key remains the final safeguard.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_idempotency_key::text, 0)
  );

  select k.request_payload, k.order_id
    into v_existing_payload, v_existing_order_id
  from private.order_idempotency_keys k
  where k.user_id = v_user_id
    and k.idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_existing_payload is distinct from v_request_payload then
      raise exception 'This idempotency key was already used with a different order request';
    end if;

    if not exists (select 1 from public.orders o where o.id = v_existing_order_id) then
      raise exception 'This idempotency key refers to an order that no longer exists';
    end if;

    return v_existing_order_id;
  end if;

  v_order_id := public.place_order_with_location(
    p_restaurant_id,
    p_customer_id,
    p_customer_name,
    p_customer_phone,
    p_delivery_type,
    p_delivery_address,
    p_pickup_branch,
    p_payment_method,
    p_items,
    p_coupon_code,
    p_customer_notes,
    p_scheduled_for,
    p_latitude,
    p_longitude
  );

  insert into private.order_idempotency_keys (
    user_id, idempotency_key, request_payload, order_id
  ) values (
    v_user_id, p_idempotency_key, v_request_payload, v_order_id
  );

  return v_order_id;
end;
$function$;

revoke all on function public.place_order_with_location_idempotent(
  uuid, uuid, uuid, text, text, public.delivery_type, text, text,
  public.payment_method, jsonb, text, text, timestamptz, double precision, double precision
) from public, anon;
grant execute on function public.place_order_with_location_idempotent(
  uuid, uuid, uuid, text, text, public.delivery_type, text, text,
  public.payment_method, jsonb, text, text, timestamptz, double precision, double precision
) to authenticated;

commit;
