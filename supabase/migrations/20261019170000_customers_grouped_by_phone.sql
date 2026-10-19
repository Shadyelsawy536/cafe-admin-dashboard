create or replace function public.get_customers_summary_by_phone(p_restaurant_id uuid)
returns table(
  customer_id uuid,
  full_name text,
  phone text,
  order_count bigint,
  total_spent numeric,
  last_order_at timestamptz,
  customer_key text
)
language sql
stable
security invoker
set search_path = public
as $function$
  with profile_rows as (
    select
      c.id,
      c.restaurant_id,
      c.full_name,
      c.phone,
      c.created_at,
      nullif(regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g'), '') as phone_key,
      case
        when nullif(regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g'), '') is not null
          then 'phone:' || regexp_replace(c.phone, '[^0-9]', '', 'g')
        else 'customer:' || c.id::text
      end as group_key
    from public.customers c
    where c.restaurant_id = p_restaurant_id
  ),
  profile_groups as (
    select
      group_key,
      (array_agg(id order by created_at asc, id))[1] as customer_id,
      (array_agg(full_name order by created_at desc, id desc))[1] as profile_name,
      (array_agg(phone order by created_at desc, id desc))[1] as profile_phone
    from profile_rows p
    where not exists (
      select 1 from public.orders existing_order
      where existing_order.restaurant_id = p.restaurant_id
        and existing_order.customer_id = p.id
    )
    group by group_key
  ),
  order_rows as (
    select
      o.id,
      o.customer_id,
      o.customer_name,
      o.customer_phone,
      o.total,
      o.status,
      o.created_at,
      case
        when nullif(regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]', '', 'g'), '') is not null
          then 'phone:' || regexp_replace(o.customer_phone, '[^0-9]', '', 'g')
        when pr.phone_key is not null then 'phone:' || pr.phone_key
        else 'customer:' || coalesce(o.customer_id, pr.id)::text
      end as group_key
    from public.orders o
    left join profile_rows pr on pr.id = o.customer_id
    where o.restaurant_id = p_restaurant_id
  ),
  order_groups as (
    select
      group_key,
      (array_agg(customer_id order by created_at asc, id))[1] as customer_id,
      (array_agg(nullif(trim(customer_name), '') order by created_at desc, id desc)
        filter (where nullif(trim(customer_name), '') is not null))[1] as latest_order_name,
      (array_agg(nullif(trim(customer_phone), '') order by created_at desc, id desc)
        filter (where nullif(trim(customer_phone), '') is not null))[1] as latest_order_phone,
      count(id) as order_count,
      coalesce(sum(total) filter (where status not in ('rejected', 'cancelled')), 0) as total_spent,
      max(created_at) as last_order_at
    from order_rows
    group by group_key
  ),
  all_keys as (
    select group_key from profile_groups
    union
    select group_key from order_groups
  )
  select
    coalesce(pg.customer_id, og.customer_id) as customer_id,
    coalesce(og.latest_order_name, pg.profile_name, 'Customer') as full_name,
    coalesce(og.latest_order_phone, pg.profile_phone, '') as phone,
    coalesce(og.order_count, 0)::bigint as order_count,
    coalesce(og.total_spent, 0)::numeric as total_spent,
    og.last_order_at,
    k.group_key as customer_key
  from all_keys k
  left join profile_groups pg using (group_key)
  left join order_groups og using (group_key)
  order by og.last_order_at desc nulls last, full_name;
$function$;

revoke all on function public.get_customers_summary_by_phone(uuid) from public, anon;
grant execute on function public.get_customers_summary_by_phone(uuid) to authenticated;
