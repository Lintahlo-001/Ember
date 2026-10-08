CREATE TABLE IF NOT EXISTS catalog.fx_rates (
  base       text PRIMARY KEY CHECK (base ~ '^[A-Z]{3}$'),
  rates      jsonb NOT NULL,
  rates_date text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE catalog.fx_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON catalog.fx_rates FROM anon, authenticated;