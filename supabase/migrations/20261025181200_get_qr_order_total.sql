create or replace function public.get_qr_order_total(p_order_id uuid,p_qr_token uuid)
returns numeric language sql stable security definer set search_path=''
as $function$
 select o.total from public.orders o join public.restaurant_tables t on t.id=o.table_id and t.restaurant_id=o.restaurant_id
 where o.id=p_order_id and t.qr_token=p_qr_token and o.order_source='qr_table' limit 1;
$function$;
revoke all on function public.get_qr_order_total(uuid,uuid) from public;
grant execute on function public.get_qr_order_total(uuid,uuid) to anon,authenticated;