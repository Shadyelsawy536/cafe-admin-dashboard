-- Migration 20261025112735: index_branch_product_overrides_and_restrict_direct_order_rpc
CREATE INDEX IF NOT EXISTS product_branch_overrides_branch_restaurant_idx
  ON public.product_branch_overrides (branch_id, restaurant_id);
CREATE INDEX IF NOT EXISTS product_branch_overrides_product_restaurant_idx
  ON public.product_branch_overrides (product_id, restaurant_id);

REVOKE ALL ON FUNCTION public.place_order(uuid, uuid, text, text, public.delivery_type, text, text, public.payment_method, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, uuid, text, text, public.delivery_type, text, text, public.payment_method, jsonb, text) TO authenticated;

REVOKE ALL ON FUNCTION public.place_order(uuid, uuid, text, text, public.delivery_type, text, text, public.payment_method, jsonb, text, text, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, uuid, text, text, public.delivery_type, text, text, public.payment_method, jsonb, text, text, timestamp with time zone) TO authenticated;