-- Product variants are public only when their parent product is part of a
-- non-hidden, non-deleted menu in an active restaurant. Staff/admin retain
-- access to variants for management.
DROP POLICY IF EXISTS product_variants_public_read ON public.product_variants;
CREATE POLICY product_variants_public_read
ON public.product_variants
FOR SELECT
TO public
USING (
  private.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = product_variants.product_id
      AND private.is_restaurant_staff(p.restaurant_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = product_variants.product_id
      AND p.deleted_at IS NULL
      AND p.status <> 'hidden'::public.product_status
      AND private.is_restaurant_active(p.restaurant_id)
  )
);
