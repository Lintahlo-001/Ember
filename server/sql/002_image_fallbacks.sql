ALTER TABLE catalog.cards ADD COLUMN IF NOT EXISTS image_path text;
ALTER TABLE catalog.sets
  ADD COLUMN IF NOT EXISTS logo_path   text,
  ADD COLUMN IF NOT EXISTS logo_source text CHECK (logo_source IN ('tcgdex', 'pokewallet'));