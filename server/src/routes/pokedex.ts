import { Router } from 'express';
import { pool } from '../db';
import { LIST_COLS, toListItem } from './catalog';

export const pokedexRouter = Router();

const CARDS_LIMIT = 1500;

const ARTWORK_VERSION = '1';
const artworkUrl = (dexId: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexId}.png?v=${ARTWORK_VERSION}`;

pokedexRouter.get('/pokedex/species', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT dex_id, name, description FROM catalog.pokemon_species ORDER BY dex_id',
  );
  res.json(
    rows.map((r) => ({
      dex_id: r.dex_id,
      name: r.name,
      description: r.description ?? null,
      image_url: artworkUrl(r.dex_id),
    })),
  );
});

pokedexRouter.get('/pokedex/regions', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, dex_start, dex_end FROM catalog.regions ORDER BY sort_order',
  );
  res.json(rows);
});

pokedexRouter.get('/pokedex/species/:dexId/cards', async (req, res) => {
  const raw = req.params.dexId;
  const dexId = Number(raw);
  if (!/^\d{1,4}$/.test(raw) || dexId < 1 || dexId > 9999) {
    res.status(400).json({ error: 'Invalid dex id' });
    return;
  }

  const species = await pool.query('SELECT 1 FROM catalog.pokemon_species WHERE dex_id = $1', [dexId]);
  if (!species.rowCount) {
    res.status(404).json({ error: 'Pokémon not found' });
    return;
  }

  const { rows } = await pool.query(
    `SELECT ${LIST_COLS}
     FROM catalog.cards
     WHERE dex_ids @> ARRAY[$1::int]
     ORDER BY set_id, NULLIF(regexp_replace(local_id, '\\D', '', 'g'), '')::int NULLS LAST, local_id
     LIMIT $2`,
    [dexId, CARDS_LIMIT + 1],
  );

  res.json({
    results: rows.slice(0, CARDS_LIMIT).map(toListItem),
    truncated: rows.length > CARDS_LIMIT,
  });
});