ALTER TABLE catalog.cards
  ADD COLUMN IF NOT EXISTS dex_inferred boolean NOT NULL DEFAULT false;