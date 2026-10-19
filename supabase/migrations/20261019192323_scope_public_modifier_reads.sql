-- Keep modifier groups readable for active public menus and staff, but do not
-- expose modifier rows that are not attached to a public product in their tenant.
DROP POLICY IF EXISTS modifier_groups_public_read ON public.modifier_groups;
CREATE POLICY modifier_groups_public_read
ON public.modifier_groups
FOR SELECT
TO public
USING (
  private.is_platform_admin()
  OR private.is_restaurant_staff(restaurant_id)
  OR private.is_restaurant_active(restaurant_id)
);

DROP POLICY IF EXISTS modifiers_public_read ON public.modifiers;
CREATE POLICY modifiers_public_read
ON public.modifiers
FOR SELECT
TO public
USING (
  private.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM public.modifier_groups g
    WHERE g.id = modifiers.modifier_group_id
      AND private.is_restaurant_staff(g.restaurant_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.modifier_groups g
    JOIN public.product_modifier_groups pmg
      ON pmg.modifier_group_id = g.id
    JOIN public.products p
      ON p.id = pmg.product_id
    WHERE g.id = modifiers.modifier_group_id
      AND p.restaurant_id = g.restaurant_id
      AND p.deleted_at IS NULL
      AND p.status <> 'hidden'::public.product_status
      AND private.is_restaurant_active(p.restaurant_id)
  )
);

DROP POLICY IF EXISTS product_modifier_groups_public_read ON public.product_modifier_groups;
CREATE POLICY product_modifier_groups_public_read
ON public.product_modifier_groups
FOR SELECT
TO public
USING (
  private.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.modifier_groups g
      ON g.id = product_modifier_groups.modifier_group_id
    WHERE p.id = product_modifier_groups.product_id
      AND p.restaurant_id = g.restaurant_id
      AND (
        private.is_restaurant_staff(p.restaurant_id)
        OR (
          p.deleted_at IS NULL
          AND p.status <> 'hidden'::public.product_status
          AND private.is_restaurant_active(p.restaurant_id)
        )
      )
  )
);
