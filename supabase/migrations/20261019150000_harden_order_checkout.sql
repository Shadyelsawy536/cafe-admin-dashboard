-- Draft hardening migration. Apply to a staging project first; do not run directly in production.
-- Harden modifier ownership, reject invalid variants, and serialize coupon-use checks.
-- Existing RPC signatures remain unchanged.
begin;

CREATE OR REPLACE FUNCTION public.place_order(p_restaurant_id uuid, p_customer_id uuid, p_customer_name text, p_customer_phone text, p_delivery_type delivery_type, p_delivery_address text, p_pickup_branch text, p_payment_method payment_method, p_items jsonb, p_coupon_code text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_tax numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := 0;
  v_tax_rate numeric(5,4) := 0;
  v_item jsonb;
  v_modifier_id_text text;
  v_product_id uuid;
  v_product_name text;
  v_base_price numeric(10,2);
  v_variant_label text;
  v_variant_delta numeric(10,2);
  v_modifier_id uuid;
  v_modifier_name text;
  v_modifier_price numeric(10,2);
  v_modifier_group_name text;
  v_unit_price numeric(10,2);
  v_line_total numeric(10,2);
  v_order_item_id uuid;
  v_quantity int;
  v_coupon_id uuid;
  v_discount_type discount_type;
  v_discount_value numeric(10,2);
  v_min_order_amount numeric(10,2);
  v_max_uses int;
  v_max_uses_per_customer int;
  v_discount_amount numeric(10,2) := 0;
  v_total_redemptions int;
  v_customer_redemptions int;
begin
  if not exists (
    select 1 from customers
    where id = p_customer_id and user_id = auth.uid() and restaurant_id = p_restaurant_id
  ) then
    raise exception 'Not authorized to place this order for this customer/restaurant';
  end if;

  select tax_rate into v_tax_rate from restaurant_settings where restaurant_id = p_restaurant_id;
  v_tax_rate := coalesce(v_tax_rate, 0);

  if p_delivery_type = 'delivery' then
    select coalesce(default_delivery_fee, 0) into v_delivery_fee
    from delivery_settings where restaurant_id = p_restaurant_id;
    v_delivery_fee := coalesce(v_delivery_fee, 0);
  end if;

  insert into orders (
    restaurant_id, customer_id, customer_name, customer_phone,
    delivery_type, delivery_address, pickup_branch, payment_method,
    subtotal, tax, total, discount_amount, status
  ) values (
    p_restaurant_id, p_customer_id, p_customer_name, p_customer_phone,
    p_delivery_type, p_delivery_address, p_pickup_branch, p_payment_method,
    0, 0, 0, 0, 'pending'
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, name, base_price into v_product_id, v_product_name, v_base_price
    from products
    where id = (v_item->>'product_id')::uuid and restaurant_id = p_restaurant_id and status = 'available';
    if not found then
      raise exception 'Product % is not available', (v_item->>'product_id');
    end if;

    v_unit_price := v_base_price;
    v_variant_label := null;

    if (v_item->>'variant_id') is not null then
      select label, price_delta into v_variant_label, v_variant_delta
      from product_variants
      where id = (v_item->>'variant_id')::uuid and product_id = v_product_id;
      if not found then raise exception 'Invalid variant % for this product', v_item->>'variant_id'; end if; v_unit_price := v_unit_price + v_variant_delta;
    end if;

    v_quantity := coalesce((v_item->>'quantity')::int, 1);
    if v_quantity < 1 then
      raise exception 'Quantity must be at least 1';
    end if;

    insert into order_items (order_id, product_id, product_name, variant_label, unit_price, quantity, line_total)
    values (v_order_id, v_product_id, v_product_name, v_variant_label, v_unit_price, v_quantity, 0)
    returning id into v_order_item_id;

    v_line_total := v_unit_price * v_quantity;

    if v_item ? 'modifier_ids' then
      for v_modifier_id_text in select jsonb_array_elements_text(v_item->'modifier_ids')
      loop
        -- Now also fetches the owning modifier_group's name, for the
        -- future Sales Analytics breakdown-by-group view.
        select m.id, m.name, m.price, mg.name
        into v_modifier_id, v_modifier_name, v_modifier_price, v_modifier_group_name
        from modifiers m
        join modifier_groups mg on mg.id = m.modifier_group_id
        where m.id = v_modifier_id_text::uuid and mg.restaurant_id = p_restaurant_id and exists (select 1 from product_modifier_groups pmg where pmg.product_id = v_product_id and pmg.modifier_group_id = mg.id);

        if not found then raise exception 'Invalid modifier % for this product or restaurant', v_modifier_id_text; end if; if found then insert into order_item_modifiers (order_item_id, modifier_id, modifier_name, price, modifier_group_name)
          values (v_order_item_id, v_modifier_id, v_modifier_name, v_modifier_price, v_modifier_group_name);
          v_line_total := v_line_total + (v_modifier_price * v_quantity);
        end if;
      end loop;
    end if;

    update order_items set line_total = v_line_total where id = v_order_item_id;
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  if p_coupon_code is not null then
    select id, discount_type, discount_value, min_order_amount, max_uses, max_uses_per_customer
    into v_coupon_id, v_discount_type, v_discount_value, v_min_order_amount, v_max_uses, v_max_uses_per_customer
    from coupons
    where restaurant_id = p_restaurant_id and code = p_coupon_code and is_active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now()) for update;

    if not found then
      raise exception 'Invalid or expired coupon code';
    end if;

    if v_subtotal < v_min_order_amount then
      raise exception 'Order does not meet the minimum amount for this coupon';
    end if;

    if v_max_uses is not null then
      select count(*) into v_total_redemptions from coupon_redemptions where coupon_id = v_coupon_id;
      if v_total_redemptions >= v_max_uses then
        raise exception 'This coupon has reached its usage limit';
      end if;
    end if;

    select count(*) into v_customer_redemptions
    from coupon_redemptions where coupon_id = v_coupon_id and customer_id = p_customer_id;
    if v_customer_redemptions >= v_max_uses_per_customer then
      raise exception 'You have already used this coupon';
    end if;

    if v_discount_type = 'percentage' then
      v_discount_amount := round(v_subtotal * (v_discount_value / 100), 2);
    else
      v_discount_amount := v_discount_value;
    end if;
    if v_discount_amount > v_subtotal then
      v_discount_amount := v_subtotal;
    end if;
  end if;

  v_tax := round((v_subtotal - v_discount_amount) * v_tax_rate, 2);

  update orders
  set subtotal = v_subtotal,
      discount_amount = v_discount_amount,
      coupon_id = v_coupon_id,
      tax = v_tax,
      total = (v_subtotal - v_discount_amount) + v_tax + v_delivery_fee
  where id = v_order_id;

  if v_coupon_id is not null then
    insert into coupon_redemptions (coupon_id, order_id, customer_id)
    values (v_coupon_id, v_order_id, p_customer_id);
  end if;

  return v_order_id;
end;
$function$


CREATE OR REPLACE FUNCTION public.place_order(p_restaurant_id uuid, p_customer_id uuid, p_customer_name text, p_customer_phone text, p_delivery_type delivery_type, p_delivery_address text, p_pickup_branch text, p_payment_method payment_method, p_items jsonb, p_coupon_code text DEFAULT NULL::text, p_customer_notes text DEFAULT ''::text, p_scheduled_for timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare v_order_id uuid; v_subtotal numeric(10,2):=0; v_tax numeric(10,2):=0; v_delivery_fee numeric(10,2):=0; v_tax_rate numeric(5,4):=0; v_item jsonb; v_modifier_id_text text; v_product_id uuid; v_product_name text; v_base_price numeric(10,2); v_variant_label text; v_variant_delta numeric(10,2); v_modifier_id uuid; v_modifier_name text; v_modifier_price numeric(10,2); v_modifier_group_name text; v_unit_price numeric(10,2); v_line_total numeric(10,2); v_order_item_id uuid; v_quantity int; v_total_items int:=0; v_coupon_id uuid; v_discount_type discount_type; v_discount_value numeric(10,2); v_min_order_amount numeric(10,2); v_max_uses int; v_max_uses_per_customer int; v_discount_amount numeric(10,2):=0; v_total_redemptions int; v_customer_redemptions int; v_preparation_minutes int:=20; v_accepts_scheduled boolean:=false; v_max_days int:=7; v_notes_enabled boolean:=true; v_availability jsonb; v_rules record; begin
  if not private.is_restaurant_active(p_restaurant_id) then raise exception 'This restaurant is not currently accepting orders'; end if;

  v_availability := get_restaurant_availability(p_restaurant_id);
  if not (v_availability->>'is_open')::boolean then
    raise exception '%', coalesce(v_availability->>'message', 'We are currently closed.');
  end if;

  if not exists(select 1 from customers where id=p_customer_id and user_id=auth.uid() and restaurant_id=p_restaurant_id) then raise exception 'Not authorized to place this order for this customer/restaurant'; end if;

  select coalesce(tax_rate,0),coalesce(preparation_time_minutes,20),coalesce(accepts_scheduled_orders,false),coalesce(scheduled_order_max_days,7),coalesce(customer_notes_enabled,true) into v_tax_rate,v_preparation_minutes,v_accepts_scheduled,v_max_days,v_notes_enabled from restaurant_settings where restaurant_id=p_restaurant_id;

  select * into v_rules from restaurant_order_rules where restaurant_id = p_restaurant_id;
  if found then
    if v_rules.require_customer_phone and (p_customer_phone is null or length(trim(p_customer_phone)) = 0) then
      raise exception 'A phone number is required to place an order';
    end if;
    if v_rules.require_delivery_address and p_delivery_type = 'delivery' and (p_delivery_address is null or length(trim(p_delivery_address)) = 0) then
      raise exception 'A delivery address is required';
    end if;
    if not v_rules.allow_customer_order_notes and p_customer_notes is not null and length(trim(p_customer_notes)) > 0 then
      raise exception 'Order notes are currently disabled';
    end if;
  end if;

  if p_customer_notes is null then p_customer_notes:=''; end if;
  if not v_notes_enabled and length(trim(p_customer_notes))>0 then raise exception 'Customer notes are currently disabled'; end if;
  if p_scheduled_for is not null then if not v_accepts_scheduled then raise exception 'Scheduled orders are currently disabled'; end if; if p_scheduled_for < now() + make_interval(mins=>v_preparation_minutes) then raise exception 'Scheduled time must be after the preparation window'; end if; if p_scheduled_for > now() + make_interval(days=>v_max_days) then raise exception 'Scheduled time is outside the allowed window'; end if; end if;
  if p_delivery_type='delivery' then select coalesce(default_delivery_fee,0) into v_delivery_fee from delivery_settings where restaurant_id=p_restaurant_id; v_delivery_fee:=coalesce(v_delivery_fee,0); end if;

  -- max_items_per_order, counted before inserting anything.
  if v_rules.max_items_per_order is not null then
    select coalesce(sum(coalesce((item->>'quantity')::int, 1)), 0) into v_total_items
    from jsonb_array_elements(p_items) as item;
    if v_total_items > v_rules.max_items_per_order then
      raise exception 'This order exceeds the maximum of % items allowed', v_rules.max_items_per_order;
    end if;
  end if;

  insert into orders(restaurant_id,customer_id,customer_name,customer_phone,delivery_type,delivery_address,pickup_branch,payment_method,subtotal,tax,total,discount_amount,status,customer_notes,scheduled_for) values(p_restaurant_id,p_customer_id,p_customer_name,p_customer_phone,p_delivery_type,p_delivery_address,p_pickup_branch,p_payment_method,0,0,0,0,'pending',trim(p_customer_notes),p_scheduled_for) returning id into v_order_id; for v_item in select * from jsonb_array_elements(p_items) loop select id,name,base_price into v_product_id,v_product_name,v_base_price from products where id=(v_item->>'product_id')::uuid and restaurant_id=p_restaurant_id and status='available'; if not found then raise exception 'Product % is not available',(v_item->>'product_id'); end if; v_unit_price:=v_base_price; v_variant_label:=null; if (v_item->>'variant_id') is not null then select label,price_delta into v_variant_label,v_variant_delta from product_variants where id=(v_item->>'variant_id')::uuid and product_id=v_product_id; if not found then raise exception 'Invalid variant % for this product', v_item->>'variant_id'; end if; v_unit_price := v_unit_price + v_variant_delta; end if; v_quantity:=coalesce((v_item->>'quantity')::int,1); if v_quantity<1 then raise exception 'Quantity must be at least 1'; end if; insert into order_items(order_id,product_id,product_name,variant_label,unit_price,quantity,line_total) values(v_order_id,v_product_id,v_product_name,v_variant_label,v_unit_price,v_quantity,0) returning id into v_order_item_id; v_line_total:=v_unit_price*v_quantity; if v_item ? 'modifier_ids' then for v_modifier_id_text in select jsonb_array_elements_text(v_item->'modifier_ids') loop select m.id,m.name,m.price,mg.name into v_modifier_id,v_modifier_name,v_modifier_price,v_modifier_group_name from modifiers m join modifier_groups mg on mg.id=m.modifier_group_id where m.id = v_modifier_id_text::uuid and mg.restaurant_id = p_restaurant_id and exists (select 1 from product_modifier_groups pmg where pmg.product_id = v_product_id and pmg.modifier_group_id = mg.id); if not found then raise exception 'Invalid modifier % for this product or restaurant', v_modifier_id_text; end if; if found then insert into order_item_modifiers(order_item_id,modifier_id,modifier_name,price,modifier_group_name) values(v_order_item_id,v_modifier_id,v_modifier_name,v_modifier_price,v_modifier_group_name); v_line_total:=v_line_total+(v_modifier_price*v_quantity); end if; end loop; end if; update order_items set line_total=v_line_total where id=v_order_item_id; v_subtotal:=v_subtotal+v_line_total; end loop; if p_coupon_code is not null then select id,discount_type,discount_value,min_order_amount,max_uses,max_uses_per_customer into v_coupon_id,v_discount_type,v_discount_value,v_min_order_amount,v_max_uses,v_max_uses_per_customer from coupons where restaurant_id=p_restaurant_id and code=p_coupon_code and is_active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()) for update; if not found then raise exception 'Invalid or expired coupon code'; end if; if v_subtotal<v_min_order_amount then raise exception 'Order does not meet the minimum amount for this coupon'; end if; if v_max_uses is not null then select count(*) into v_total_redemptions from coupon_redemptions where coupon_id=v_coupon_id; if v_total_redemptions>=v_max_uses then raise exception 'This coupon has reached its usage limit'; end if; end if; select count(*) into v_customer_redemptions from coupon_redemptions where coupon_id=v_coupon_id and customer_id=p_customer_id; if v_customer_redemptions>=v_max_uses_per_customer then raise exception 'You have already used this coupon'; end if; if v_discount_type='percentage' then v_discount_amount:=round(v_subtotal*(v_discount_value/100),2); else v_discount_amount:=v_discount_value; end if; if v_discount_amount>v_subtotal then v_discount_amount:=v_subtotal; end if; end if; v_tax:=round((v_subtotal-v_discount_amount)*v_tax_rate,2); update orders set subtotal=v_subtotal,discount_amount=v_discount_amount,coupon_id=v_coupon_id,tax=v_tax,total=(v_subtotal-v_discount_amount)+v_tax+v_delivery_fee where id=v_order_id; if v_coupon_id is not null then insert into coupon_redemptions(coupon_id,order_id,customer_id) values(v_coupon_id,v_order_id,p_customer_id); end if; return v_order_id; end; $function$


commit;
