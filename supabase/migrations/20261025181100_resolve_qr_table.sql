create or replace function public.resolve_qr_table(p_qr_token uuid)
returns table(restaurant_id uuid,restaurant_slug text,branch_id uuid,table_id uuid,table_number text,table_display_name text,accepts_dine_in boolean,table_active boolean)
language sql stable security definer set search_path=''
as $function$
 select t.restaurant_id,r.slug,t.branch_id,t.id,t.table_number,coalesce(nullif(trim(t.display_name),''),'Table '||t.table_number),s.accepts_dine_in,t.is_active
 from public.restaurant_tables t join public.restaurants r on r.id=t.restaurant_id join public.restaurant_settings s on s.restaurant_id=r.id
 join public.restaurant_locations l on l.id=t.branch_id and l.restaurant_id=t.restaurant_id
 where t.qr_token=p_qr_token and t.is_active=true and l.is_active=true limit 1;
$function$;
revoke all on function public.resolve_qr_table(uuid) from public;
grant execute on function public.resolve_qr_table(uuid) to anon,authenticated;