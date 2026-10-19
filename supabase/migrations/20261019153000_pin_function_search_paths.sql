-- Pin search_path on functions flagged by the Supabase security advisor.
-- Their current bodies use public objects and schema-qualify private helpers where needed.
begin;

alter function public.get_platform_analytics() set search_path to public;
alter function private.is_restaurant_active(uuid) set search_path to public;
alter function public.get_restaurant_availability(uuid) set search_path to public;
alter function public.get_feature_flag(uuid, text) set search_path to public;
alter function public.generate_restaurant_login_id() set search_path to public;

commit;
