
-- Fix for solana_agent_metrics
ALTER TABLE solana_agent_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to solana_agent_metrics" ON solana_agent_metrics;
CREATE POLICY "Allow all access to solana_agent_metrics" ON solana_agent_metrics
  FOR ALL USING (true) WITH CHECK (true);

-- Apply the same fix to any other Solana tables that accept manual input
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename LIKE 'solana_%'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all access to %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Allow all access to %I" ON %I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
