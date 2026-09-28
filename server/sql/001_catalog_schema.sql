CREATE SCHEMA IF NOT EXISTS catalog;
REVOKE ALL ON SCHEMA catalog FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS catalog.sets (
  id                  text PRIMARY KEY,            -- TCGdex set id, e.g. 'swsh3'
  name                text NOT NULL,
  serie_id            text,                        -- TCGdex `serie`, used for Dashboard grouping
  serie_name          text,
  logo                text,
  symbol              text,
  release_date        date,
  card_count_total    integer NOT NULL DEFAULT 0,
  card_count_official integer NOT NULL DEFAULT 0,
  synced_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sets_serie_idx ON catalog.sets (serie_name);

CREATE TABLE IF NOT EXISTS catalog.cards (
  id               text PRIMARY KEY,               -- e.g. 'swsh3-136'
  set_id           text NOT NULL REFERENCES catalog.sets(id) ON DELETE CASCADE,
  local_id         text NOT NULL,
  name             text NOT NULL,
  image_base       text,                           -- TCGdex base URL; append /high.webp etc.
  image_source     text CHECK (image_source IN ('tcgdex', 'pokewallet')),
  category         text,
  rarity           text,
  illustrator      text,
  dex_ids          integer[] NOT NULL DEFAULT '{}',
  variants         jsonb,
  pricing          jsonb,                          -- raw TCGdex pricing block
  price_market     numeric(10,2),                  -- standard-variant market price
  price_currency   text,
  detail_synced_at timestamptz,                    -- NULL = only brief data from set sync
  synced_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cards_set_idx ON catalog.cards (set_id);
CREATE INDEX IF NOT EXISTS cards_illustrator_idx ON catalog.cards (illustrator);
CREATE INDEX IF NOT EXISTS cards_dex_idx ON catalog.cards USING GIN (dex_ids);
CREATE INDEX IF NOT EXISTS cards_detail_synced_idx ON catalog.cards (detail_synced_at);

ALTER TABLE catalog.sets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.cards ENABLE ROW LEVEL SECURITY;