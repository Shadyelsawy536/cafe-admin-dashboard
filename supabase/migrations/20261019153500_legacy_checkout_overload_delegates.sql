-- Ensure legacy 10-argument clients cannot bypass the newer checkout policy.
-- Delegate to the hardened 12-argument overload with default notes/schedule.
-- Keep this migration after 20261019153000_harden_order_checkout.sql.
begin;

CREATE OR REPLACE FUNCTION public.place_order(
  p_restaurant_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_type public.delivery_type,
  p_delivery_address text,
  p_pickup_branch text,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_coupon_code text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Pass all 12 arguments explicitly. This avoids overload resolution
  -- selecting this legacy function recursively and ensures the modern
  -- implementation applies restaurant status/hours, order rules, modifier
  -- and variant validation, coupon limits, and pricing checks.
  RETURN public.place_order(
    p_restaurant_id,
    p_customer_id,
    p_customer_name,
    p_customer_phone,
    p_delivery_type,
    p_delivery_address,
    p_pickup_branch,
    p_payment_method,
    p_items,
    p_coupon_code,
    ''::text,
    NULL::timestamptz
  );
END;
$function$;

commit;
