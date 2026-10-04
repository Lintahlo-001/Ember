ALTER TABLE catalog.rarities
  ADD COLUMN IF NOT EXISTS icon_version    text,
  ADD COLUMN IF NOT EXISTS icon_updated_at timestamptz;

UPDATE catalog.rarities
SET icon_version = substr(md5(icon_path), 1, 8)
WHERE icon_path IS NOT NULL AND icon_version IS NULL;