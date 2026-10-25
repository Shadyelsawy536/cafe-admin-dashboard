-- Migration 20261025111234: branch_product_price_availability_overrides
ALTER TABLE public.products ADD CONSTRAINT products_id_restaurant_id_key UNIQUE (id, restaurant_id);

CREATE TABLE public.product_branch_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  product_id uuid NOT NULL,
  price_override numeric(10,2) NULL CHECK (price_override IS NULL OR price_override >= 0),
  is_available boolean NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_branch_overrides_branch_restaurant_fkey FOREIGN KEY (branch_id, restaurant_id) REFERENCES public.restaurant_locations (id, restaurant_id) ON DELETE CASCADE,
  CONSTRAINT product_branch_overrides_product_restaurant_fkey FOREIGN KEY (product_id, restaurant_id) REFERENCES public.products (id, restaurant_id) ON DELETE CASCADE,
  CONSTRAINT product_branch_overrides_branch_product_key UNIQUE (branch_id, product_id)
);

CREATE INDEX product_branch_overrides_restaurant_branch_idx ON public.product_branch_overrides (restaurant_id, branch_id);
ALTER TABLE public.product_branch_overrides ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.product_branch_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_branch_overrides TO authenticated;

CREATE POLICY product_branch_overrides_public_read ON public.product_branch_overrides FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.restaurant_locations l WHERE l.id = product_branch_overrides.branch_id AND l.restaurant_id = product_branch_overrides.restaurant_id AND l.is_active = true)
  AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_branch_overrides.product_id AND p.restaurant_id = product_branch_overrides.restaurant_id AND p.deleted_at IS NULL AND p.status <> 'hidden'::public.product_status)
);
CREATE POLICY product_branch_overrides_staff_insert ON public.product_branch_overrides FOR INSERT TO authenticated WITH CHECK (
  private.is_platform_admin() OR (private.has_permission(restaurant_id, 'menu.manage') AND private.is_restaurant_active(restaurant_id) AND private.can_access_branch(restaurant_id, branch_id))
);
CREATE POLICY product_branch_overrides_staff_update ON public.product_branch_overrides FOR UPDATE TO authenticated USING (
  private.is_platform_admin() OR (private.has_permission(restaurant_id, 'menu.manage') AND private.is_restaurant_active(restaurant_id) AND private.can_access_branch(restaurant_id, branch_id))
) WITH CHECK (
  private.is_platform_admin() OR (private.has_permission(restaurant_id, 'menu.manage') AND private.is_restaurant_active(restaurant_id) AND private.can_access_branch(restaurant_id, branch_id))
);
CREATE POLICY product_branch_overrides_staff_delete ON public.product_branch_overrides FOR DELETE TO authenticated USING (
  private.is_platform_admin() OR (private.has_permission(restaurant_id, 'menu.manage') AND private.is_restaurant_active(restaurant_id) AND private.can_access_branch(restaurant_id, branch_id))
);
COMMENT ON TABLE public.product_branch_overrides IS 'Optional per-branch product price and availability overrides; NULL values inherit the product-level defaults.';
COMMENT ON COLUMN public.product_branch_overrides.price_override IS 'Branch-specific unit base price; NULL inherits products.base_price.';
COMMENT ON COLUMN public.product_branch_overrides.is_available IS 'Branch-specific availability; NULL inherits products.status (available).';