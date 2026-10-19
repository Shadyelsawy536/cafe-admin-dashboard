-- Restrict profile directory access to the profile owner, platform admins,
-- and staff who share a restaurant with the profile being viewed.
DROP POLICY IF EXISTS profiles_read_all ON public.profiles;
CREATE POLICY profiles_scoped_read
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
  OR private.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM public.restaurant_users ru
    WHERE ru.user_id = profiles.id
      AND private.is_restaurant_staff(ru.restaurant_id)
  )
);

-- These RPCs are for the authenticated Master Dashboard only. Their internal
-- admin checks remain in place as defense in depth.
REVOKE EXECUTE ON FUNCTION public.create_restaurant_full(text, text, uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_restaurant_full(text, text, uuid, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_restaurant_full(text, text, uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_restaurant_full(text, text, uuid, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_platform_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_users() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_system_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_system_health() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_restaurant_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_restaurant_details(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.remove_platform_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_platform_user(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_restaurant_status(uuid, public.restaurant_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_restaurant_status(uuid, public.restaurant_status, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_restaurant_login_id(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_restaurant_login_id(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_platform_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_analytics() TO authenticated;
