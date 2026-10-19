-- Draft API privilege hardening. Test against staging before deployment.
-- Keep the public tenant resolver public; restrict admin and customer mutation RPCs.
begin;

-- Trigger-only helpers must not be callable as public RPC endpoints.
revoke execute on function public.broadcast_order_changes() from public, anon, authenticated;
revoke execute on function public.broadcast_order_realtime() from public, anon, authenticated;

-- Admin-only RPCs: authenticated callers still pass the function's own platform-admin check.
revoke execute on function public.get_platform_analytics() from public, anon;
grant execute on function public.get_platform_analytics() to authenticated;
revoke execute on function public.cancel_subscription(uuid, boolean, text) from public, anon;
grant execute on function public.cancel_subscription(uuid, boolean, text) to authenticated;

revoke execute on function public.change_subscription_plan(uuid, uuid) from public, anon;
grant execute on function public.change_subscription_plan(uuid, uuid) to authenticated;

revoke execute on function public.create_restaurant_full(text, text, uuid, text, text, text) from public, anon;
grant execute on function public.create_restaurant_full(text, text, uuid, text, text, text) to authenticated;

revoke execute on function public.create_restaurant_full(text, text, uuid, text, text, text, text) from public, anon;
grant execute on function public.create_restaurant_full(text, text, uuid, text, text, text, text) to authenticated;

revoke execute on function public.extend_subscription(uuid, integer) from public, anon;
grant execute on function public.extend_subscription(uuid, integer) to authenticated;

revoke execute on function public.get_audit_logs(uuid, text, integer) from public, anon;
grant execute on function public.get_audit_logs(uuid, text, integer) to authenticated;

revoke execute on function public.get_platform_users() from public, anon;
grant execute on function public.get_platform_users() to authenticated;

revoke execute on function public.get_restaurant_details(uuid) from public, anon;
grant execute on function public.get_restaurant_details(uuid) to authenticated;

revoke execute on function public.get_system_health() from public, anon;
grant execute on function public.get_system_health() to authenticated;

revoke execute on function public.remove_platform_user(uuid) from public, anon;
grant execute on function public.remove_platform_user(uuid) to authenticated;

revoke execute on function public.set_restaurant_status(uuid, public.restaurant_status, text) from public, anon;
grant execute on function public.set_restaurant_status(uuid, public.restaurant_status, text) to authenticated;

revoke execute on function public.update_restaurant_login_id(uuid, text) from public, anon;
grant execute on function public.update_restaurant_login_id(uuid, text) to authenticated;

-- Customer actions require a real authenticated customer session.
revoke execute on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;

revoke execute on function public.set_order_metadata(uuid, text, timestamp with time zone) from public, anon;
grant execute on function public.set_order_metadata(uuid, text, timestamp with time zone) to authenticated;

-- Anonymous startup intentionally registers unclaimed device tokens; the function body prevents anonymous callers from taking ownership of another user's token.
revoke execute on function public.register_customer_push_device(uuid, text, text) from public;
grant execute on function public.register_customer_push_device(uuid, text, text) to anon, authenticated;

-- Both order RPC overloads validate auth.uid() and customer ownership internally.
revoke execute on function public.place_order(uuid, uuid, text, text, public.delivery_type, text, text, public.payment_method, jsonb, text) from public, anon;
grant execute on function public.place_order(uuid, uuid, text, text, public.delivery_type, text, text, public.payment_method, jsonb, text) to authenticated;

revoke execute on function public.place_order(uuid, uuid, text, text, public.delivery_type, text, text, public.payment_method, jsonb, text, text, timestamp with time zone) from public, anon;
grant execute on function public.place_order(uuid, uuid, text, text, public.delivery_type, text, text, public.payment_method, jsonb, text, text, timestamp with time zone) to authenticated;

-- Intentionally unchanged: public.resolve_restaurant_by_domain(text) is needed for storefront tenant resolution.
commit;
