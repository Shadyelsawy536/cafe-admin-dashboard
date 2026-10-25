-- Migration 20261025112413: validate_selected_branch_matches_pickup_order
-- Replaces the explicit-branch checkout RPC with pickup/menu branch consistency validation.
CREATE OR REPLACE FUNCTION public.place_order_with_branch(p_restaurant_id uuid, p_customer_id uuid, p_customer_name text, p_customer_phone text, p_delivery_type delivery_type, p_delivery_address text, p_pickup_branch text, p_payment_method payment_method, p_branch_id uuid, p_items jsonb, p_coupon_code text DEFAULT NULL::text, p_customer_notes text DEFAULT ''::text, p_scheduled_for timestamp with time zone DEFAULT NULL::timestamp with time zone, p_latitude double precision DEFAULT NULL::double precision, p_longitude double precision DEFAULT NULL::double precision)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order_id uuid;
  v_zone_id uuid;
  v_zone_name text;
  v_branch_id uuid;
  v_delivery_fee numeric(10,2) := 0;
  v_min_order_amount numeric(10,2) := 0;
  v_subtotal numeric(10,2);
  v_discount_amount numeric(10,2);
  v_tax numeric(10,2);
  v_payment_verified boolean := (p_payment_method = 'cash'::public.payment_method);
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to place an order';
  end if;

  if not exists (
    select 1
    from public.customers c
    where c.id = p_customer_id
      and c.user_id = auth.uid()
      and c.restaurant_id = p_restaurant_id
  ) then
    raise exception 'Not authorized to place this order for this customer/restaurant';
  end if;

  if p_delivery_type = 'delivery'::public.delivery_type then
    if p_latitude is null or p_longitude is null then
      raise exception 'Delivery location is required';
    end if;

    if p_latitude < -90 or p_latitude > 90
       or p_longitude < -180 or p_longitude > 180 then
      raise exception 'Invalid delivery location';
    end if;

    select
      z.id,
      z.name,
      z.delivery_fee,
      z.min_order_amount,
      z.branch_id
    into
      v_zone_id,
      v_zone_name,
      v_delivery_fee,
      v_min_order_amount,
      v_branch_id
    from public.delivery_zones z
    where z.restaurant_id = p_restaurant_id
      and z.is_active = true
      and z.boundary_geojson is not null
      and extensions.ST_Contains(
        extensions.ST_SetSRID(
          extensions.ST_GeomFromGeoJSON(z.boundary_geojson::text),
          4326
        ),
        extensions.ST_SetSRID(
          extensions.ST_Point(p_longitude, p_latitude),
          4326
        )
      )
    order by z.id
    limit 1;

    if v_zone_id is null then
      raise exception 'Delivery is not available at your current location';
    end if;
  end if;

  if p_branch_id is not null then
    if v_branch_id is not null and v_branch_id <> p_branch_id then
      raise exception 'The selected branch does not serve this delivery area';
    end if;
    select l.id into v_branch_id
    from public.restaurant_locations l
    where l.id = p_branch_id and l.restaurant_id = p_restaurant_id and l.is_active = true;
    if v_branch_id is null then
      raise exception 'Invalid or inactive branch';
    end if;
    if p_delivery_type = 'pickup'::public.delivery_type
       and p_pickup_branch is not null
       and not exists (
         select 1 from public.restaurant_locations l
         where l.id = v_branch_id
           and l.restaurant_id = p_restaurant_id
           and lower(trim(l.name)) = lower(trim(p_pickup_branch))
       ) then
      raise exception 'Selected pickup branch does not match the menu branch';
    end if;
  elsif p_delivery_type = 'pickup'::public.delivery_type then
    select l.id into v_branch_id
    from public.restaurant_locations l
    where l.restaurant_id = p_restaurant_id and l.is_active = true
      and lower(trim(l.name)) = lower(trim(coalesce(p_pickup_branch, '')))
    order by l.is_primary desc, l.sort_order
    limit 1;
    if v_branch_id is null and exists (
      select 1 from public.restaurant_locations l
      where l.restaurant_id = p_restaurant_id and l.is_active = true
    ) then
      raise exception 'Please select a valid pickup branch';
    end if;
  end if;

  if v_branch_id is null then
    select l.id into v_branch_id
    from public.restaurant_locations l
    where l.restaurant_id = p_restaurant_id and l.is_active = true
    order by l.is_primary desc, l.sort_order
    limit 1;
  end if;

  perform set_config('hubdine.branch_id', coalesce(v_branch_id::text, ''), true);

  v_order_id := public.place_order(
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
    p_scheduled_for
  );

  select
    o.subtotal,
    o.discount_amount,
    o.tax
  into
    v_subtotal,
    v_discount_amount,
    v_tax
  from public.orders o
  where o.id = v_order_id
    and o.restaurant_id = p_restaurant_id
  for update;

  if p_delivery_type = 'delivery'::public.delivery_type
     and v_subtotal < coalesce(v_min_order_amount, 0) then
    raise exception
      'This delivery zone requires a minimum order of %',
      coalesce(v_min_order_amount, 0);
  end if;

  update public.orders
  set
    branch_id = v_branch_id,
    delivery_zone_id = v_zone_id,
    delivery_zone_name = v_zone_name,
    delivery_fee = case
      when p_delivery_type = 'delivery'::public.delivery_type
        then coalesce(v_delivery_fee, 0)
      else 0
    end,
    delivery_latitude = case
      when p_delivery_type = 'delivery'::public.delivery_type then p_latitude
      else null
    end,
    delivery_longitude = case
      when p_delivery_type = 'delivery'::public.delivery_type then p_longitude
      else null
    end,
    total = case
      when p_delivery_type = 'delivery'::public.delivery_type
        then (coalesce(v_subtotal, 0) - coalesce(v_discount_amount, 0))
          + coalesce(v_tax, 0)
          + coalesce(v_delivery_fee, 0)
      else
        (coalesce(v_subtotal, 0) - coalesce(v_discount_amount, 0))
          + coalesce(v_tax, 0)
    end,
    payment_verified = v_payment_verified,
    updated_at = now()
  where id = v_order_id
    and restaurant_id = p_restaurant_id;

  return v_order_id;
end;
$function$
;