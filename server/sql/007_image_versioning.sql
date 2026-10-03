ALTER TABLE catalog.cards
  ADD COLUMN IF NOT EXISTS image_etag          text,
  ADD COLUMN IF NOT EXISTS image_last_modified text,
  ADD COLUMN IF NOT EXISTS image_version       text,
  ADD COLUMN IF NOT EXISTS image_checked_at    timestamptz;

CREATE INDEX IF NOT EXISTS cards_image_checked_idx
  ON catalog.cards (image_checked_at NULLS FIRST);

ALTER TABLE catalog.sets
  ADD COLUMN IF NOT EXISTS images_updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION catalog.bump_set_images() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE catalog.sets SET images_updated_at = now() WHERE id = NEW.set_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cards_bump_set_images ON catalog.cards;
CREATE TRIGGER cards_bump_set_images
  AFTER UPDATE OF image_version ON catalog.cards
  FOR EACH ROW
  WHEN (OLD.image_version IS NOT NULL AND OLD.image_version IS DISTINCT FROM NEW.image_version)
  EXECUTE FUNCTION catalog.bump_set_images();