-- Rarity icons are uploaded by hand to a public Storage bucket (`rarity-icons`),
-- then linked here by filling in icon_path (e.g. 'double-rare.webp').
CREATE TABLE IF NOT EXISTS catalog.rarities (
  name      text PRIMARY KEY,   -- exactly as TCGdex spells it, e.g. 'Double rare'
  icon_path text                -- NULL = no icon yet; UI falls back to a text label
);
ALTER TABLE catalog.rarities ENABLE ROW LEVEL SECURITY;

INSERT INTO catalog.rarities (name)
SELECT DISTINCT rarity FROM catalog.cards WHERE rarity IS NOT NULL
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION catalog.track_rarity() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.rarity IS NOT NULL THEN
    INSERT INTO catalog.rarities (name) VALUES (NEW.rarity) ON CONFLICT (name) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cards_track_rarity ON catalog.cards;
CREATE TRIGGER cards_track_rarity
  AFTER INSERT OR UPDATE OF rarity ON catalog.cards
  FOR EACH ROW EXECUTE FUNCTION catalog.track_rarity();