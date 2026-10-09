ALTER TABLE catalog.cards
  ADD COLUMN IF NOT EXISTS images_locked boolean NOT NULL DEFAULT false;

ALTER TABLE catalog.sets
  ADD COLUMN IF NOT EXISTS logo_version   text,
  ADD COLUMN IF NOT EXISTS symbol_version text;