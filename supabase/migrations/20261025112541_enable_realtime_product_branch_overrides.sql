-- Migration 20261025112541: enable_realtime_product_branch_overrides
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'product_branch_overrides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_branch_overrides;
  END IF;
END
$$;