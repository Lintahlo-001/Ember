CREATE TABLE IF NOT EXISTS catalog.pokemon_species (
  dex_id      integer PRIMARY KEY CHECK (dex_id BETWEEN 1 AND 9999),
  name        text NOT NULL,                 
  slug        text NOT NULL,                
  description text,                         
  synced_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pokemon_species_slug_idx ON catalog.pokemon_species (slug);

CREATE TABLE IF NOT EXISTS catalog.regions (
  id         text PRIMARY KEY,              
  name       text NOT NULL,
  dex_start  integer NOT NULL,
  dex_end    integer NOT NULL,
  sort_order integer NOT NULL,
  CHECK (dex_start >= 1 AND dex_end >= dex_start)
);

ALTER TABLE catalog.pokemon_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.regions         ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON catalog.pokemon_species, catalog.regions FROM anon, authenticated;

INSERT INTO catalog.regions (id, name, dex_start, dex_end, sort_order) VALUES
  ('kanto',  'Kanto',    1,  151,  1),
  ('johto',  'Johto',  152,  251,  2),
  ('hoenn',  'Hoenn',  252,  386,  3),
  ('sinnoh', 'Sinnoh', 387,  493,  4),
  ('unova',  'Unova',  494,  649,  5),
  ('kalos',  'Kalos',  650,  721,  6),
  ('alola',  'Alola',  722,  809,  7),
  ('galar',  'Galar',  810,  898,  8),
  ('hisui',  'Hisui',  899,  905,  9),
  ('paldea', 'Paldea', 906, 1025, 10)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, dex_start = EXCLUDED.dex_start,
  dex_end = EXCLUDED.dex_end, sort_order = EXCLUDED.sort_order;