create or replace function public.place_qr_table_order(
  p_qr_token uuid, p_customer_name text, p_customer_phone text,
  p_payment_method public.payment_method, p_items jsonb, p_customer_notes text default ''
) returns uuid
language plpgsql security definer set search_path = ''
as $function$
declare
  v_table record; v_order_id uuid; v_item jsonb; v_product_id uuid; v_product_name text;
  v_product_status public.product_status; v_base_price numeric(10,2); v_variant_id uuid;
  v_variant_label text; v_variant_delta numeric(10,2); v_quantity integer; v_modifier_id uuid;
  v_modifier_name text; v_modifier_price numeric(10,2); v_modifier_group_name text;
  v_order_item_id uuid; v_unit_price numeric(10,2); v_line_total numeric(10,2);
  v_subtotal numeric(10,2):=0; v_tax_rate numeric(5,4):=0; v_tax numeric(10,2):=0;
  v_total numeric(10,2):=0; v_availability jsonb; v_notes text:=coalesce(p_customer_notes,'');
  v_offer_discount numeric(10,2); v_offer_best numeric(10,2);
begin
  if p_qr_token is null then raise exception 'Invalid table QR code'; end if;
  if length(trim(coalesce(p_customer_name,''))) < 2 then raise exception 'Enter your name'; end if;
  if length(trim(coalesce(p_customer_phone,''))) < 5 then raise exception 'Enter a valid phone number'; end if;
  if p_payment_method not in ('cash'::public.payment_method,'visa'::public.payment_method) then raise exception 'Unsupported payment method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'Your cart is empty or contains too many items'; end if;
  if length(v_notes)>1000 then raise exception 'Order notes are too long'; end if;
  select t.id as table_id,t.restaurant_id,t.branch_id,t.table_number,t.display_name,r.status as restaurant_status,r.name as restaurant_name,r.slug as restaurant_slug,s.accepts_dine_in,s.tax_rate,s.customer_notes_enabled
    into v_table from public.restaurant_tables t join public.restaurants r on r.id=t.restaurant_id join public.restaurant_settings s on s.restaurant_id=r.id
    join public.restaurant_locations l on l.id=t.branch_id and l.restaurant_id=t.restaurant_id
    where t.qr_token=p_qr_token and t.is_active=true and l.is_active=true limit 1;
  if v_table.table_id is null then raise exception 'This table QR is inactive or invalid'; end if;
  if not v_table.accepts_dine_in then raise exception 'This restaurant is not accepting Dine In orders'; end if;
  if not private.is_restaurant_active(v_table.restaurant_id) then raise exception 'This restaurant is not currently accepting orders'; end if;
  if not v_table.customer_notes_enabled and length(trim(v_notes))>0 then raise exception 'Order notes are currently disabled'; end if;
  v_availability:=public.get_restaurant_availability(v_table.restaurant_id);
  if coalesce((v_availability->>'is_open')::boolean,false) is false then raise exception '%',coalesce(v_availability->>'message','This restaurant is currently closed'); end if;
  v_tax_rate:=coalesce(v_table.tax_rate,0);
  insert into public.orders(restaurant_id,customer_id,customer_name,customer_phone,delivery_type,delivery_address,pickup_branch,payment_method,subtotal,tax,total,discount_amount,status,customer_notes,scheduled_for,branch_id,payment_verified,order_source,table_id,table_number_snapshot)
  values(v_table.restaurant_id,null,trim(p_customer_name),trim(p_customer_phone),'dine_in',null,coalesce(nullif(trim(v_table.display_name),''),'Table '||v_table.table_number),p_payment_method,0,0,0,0,'pending',trim(v_notes),null,v_table.branch_id,(p_payment_method='cash'::public.payment_method),'qr_table',v_table.table_id,v_table.table_number)
  returning id into v_order_id;
  for v_item in select elem from jsonb_array_elements(p_items) as x(elem) loop
    begin v_product_id:=(v_item->>'product_id')::uuid; exception when others then raise exception 'Invalid product in cart'; end;
    v_quantity:=coalesce((v_item->>'quantity')::integer,0);
    if v_quantity<1 or v_quantity>20 then raise exception 'Product quantity must be between 1 and 20'; end if;
    select p.name,coalesce(bpo.price_override,p.base_price),p.status into v_product_name,v_base_price,v_product_status
      from public.products p left join public.product_branch_overrides bpo on bpo.product_id=p.id and bpo.restaurant_id=p.restaurant_id and bpo.branch_id=v_table.branch_id
      where p.id=v_product_id and p.restaurant_id=v_table.restaurant_id and p.deleted_at is null and p.status<>'hidden'::public.product_status
      and (case when bpo.is_available is null then p.status='available'::public.product_status else bpo.is_available end);
    if not found then raise exception 'An item in your cart is no longer available'; end if;
    v_unit_price:=v_base_price; v_variant_label:=null;
    if nullif(v_item->>'variant_id','') is not null then
      begin v_variant_id:=(v_item->>'variant_id')::uuid; exception when others then raise exception 'Invalid product option'; end;
      select pv.label,pv.price_delta into v_variant_label,v_variant_delta from public.product_variants pv where pv.id=v_variant_id and pv.product_id=v_product_id;
      if not found then raise exception 'A selected product option is no longer available'; end if;
      v_unit_price:=v_unit_price+coalesce(v_variant_delta,0);
    end if;
    insert into public.order_items(order_id,product_id,product_name,variant_label,unit_price,quantity,line_total) values(v_order_id,v_product_id,v_product_name,v_variant_label,v_unit_price,v_quantity,v_unit_price*v_quantity) returning id into v_order_item_id;
    v_line_total:=v_unit_price*v_quantity;
    if v_item ? 'modifier_ids' then
      if jsonb_typeof(v_item->'modifier_ids')<>'array' or jsonb_array_length(v_item->'modifier_ids')>20 then raise exception 'Invalid product add-ons'; end if;
      for v_modifier_id in select elem::uuid from jsonb_array_elements_text(v_item->'modifier_ids') as x(elem) loop
        select m.name,m.price,mg.name into v_modifier_name,v_modifier_price,v_modifier_group_name from public.modifiers m
        join public.modifier_groups mg on mg.id=m.modifier_group_id join public.product_modifier_groups pmg on pmg.modifier_group_id=mg.id and pmg.product_id=v_product_id
        where m.id=v_modifier_id and mg.restaurant_id=v_table.restaurant_id;
        if not found then raise exception 'A selected add-on is not valid for this product'; end if;
        insert into public.order_item_modifiers(order_item_id,modifier_id,modifier_name,price,modifier_group_name) values(v_order_item_id,v_modifier_id,v_modifier_name,v_modifier_price,v_modifier_group_name);
        v_line_total:=v_line_total+(v_modifier_price*v_quantity);
      end loop;
    end if;
    select coalesce(max(case when o.discount_type='percentage' then round(v_line_total*(o.discount_value/100),2) else least(v_line_total,o.discount_value*v_quantity) end),0) into v_offer_best
    from public.offers o where o.restaurant_id=v_table.restaurant_id and o.is_active=true and (o.starts_at is null or o.starts_at<=now()) and (o.ends_at is null or o.ends_at>=now())
      and (o.applies_to='all' or (o.applies_to='product' and o.product_id=v_product_id) or (o.applies_to='category' and o.category_id=(select p.category_id from public.products p where p.id=v_product_id)));
    v_offer_discount:=least(v_line_total,greatest(0,coalesce(v_offer_best,0))); v_line_total:=greatest(0,v_line_total-v_offer_discount);
    update public.order_items set line_total=v_line_total where id=v_order_item_id; v_subtotal:=v_subtotal+v_line_total;
  end loop;
  v_tax:=round(v_subtotal*v_tax_rate,2); v_total:=v_subtotal+v_tax;
  update public.orders set subtotal=v_subtotal,tax=v_tax,total=v_total,updated_at=now() where id=v_order_id and restaurant_id=v_table.restaurant_id;
  return v_order_id;
end;
$function$;
revoke all on function public.place_qr_table_order(uuid,text,text,public.payment_method,jsonb,text) from public;
grant execute on function public.place_qr_table_order(uuid,text,text,public.payment_method,jsonb,text) to anon,authenticated;