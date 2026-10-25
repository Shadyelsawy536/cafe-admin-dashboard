alter table public.orders alter column order_source set default 'unknown';

create or replace function public.set_customer_order_source(p_order_id uuid,p_order_source text)
returns boolean language plpgsql security definer set search_path=''
as $function$
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  if p_order_source not in ('website','app') then raise exception 'Unsupported order source'; end if;
  update public.orders o set order_source=p_order_source,updated_at=now()
  where o.id=p_order_id and o.order_source='unknown' and o.customer_id is not null
    and exists(select 1 from public.customers c where c.id=o.customer_id and c.user_id=auth.uid() and c.restaurant_id=o.restaurant_id);
  if not found then return false; end if;
  return true;
end;
$function$;
revoke all on function public.set_customer_order_source(uuid,text) from public;
grant execute on function public.set_customer_order_source(uuid,text) to authenticated;