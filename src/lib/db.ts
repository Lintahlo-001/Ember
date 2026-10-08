import * as SQLite from 'expo-sqlite';

const DB_NAME = 'ember.db';

// Append only. Index = schema version - 1. Never edit a shipped entry.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE meta (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE sets (
    id                  TEXT PRIMARY KEY NOT NULL,
    name                TEXT NOT NULL,
    serie_id            TEXT,
    serie_name          TEXT,
    release_date        TEXT,
    card_count_total    INTEGER NOT NULL DEFAULT 0,
    card_count_official INTEGER NOT NULL DEFAULT 0,
    logo_url            TEXT,
    symbol_url          TEXT,
    logo_local_path     TEXT,
    symbol_local_path   TEXT,
    images_updated_at   TEXT,
    synced_at           TEXT,
    cards_cached_at     TEXT
  );
  CREATE INDEX sets_serie_idx ON sets(serie_name);

  CREATE TABLE cards (
    id                       TEXT PRIMARY KEY NOT NULL,
    set_id                   TEXT NOT NULL,
    local_id                 TEXT NOT NULL,
    name                     TEXT NOT NULL,
    rarity                   TEXT,
    illustrator              TEXT,
    price_market             REAL,
    price_currency           TEXT,
    image_url                TEXT,
    image_version            TEXT,
    image_local_path         TEXT,
    image_downloaded_version TEXT,
    detail                   TEXT,
    detail_synced_at         TEXT,
    synced_at                TEXT
  );
  CREATE INDEX cards_set_idx    ON cards(set_id);
  CREATE INDEX cards_name_idx   ON cards(name);
  CREATE INDEX cards_artist_idx ON cards(illustrator);

  CREATE TABLE ownership_entries (
    id         TEXT PRIMARY KEY NOT NULL,
    user_id    TEXT NOT NULL,
    card_id    TEXT NOT NULL,
    variant    TEXT NOT NULL,
    condition  TEXT NOT NULL,
    quantity   INTEGER NOT NULL,
    notes      TEXT,
    updated_at TEXT NOT NULL,
    sync_state TEXT NOT NULL DEFAULT 'synced' CHECK (sync_state IN ('synced','pending'))
  );
  CREATE UNIQUE INDEX ownership_key_uq
    ON ownership_entries(user_id, card_id, variant, condition);
  CREATE INDEX ownership_card_idx ON ownership_entries(user_id, card_id);

  CREATE TABLE wishlist (
    user_id    TEXT NOT NULL,
    key        TEXT NOT NULL,
    sync_state TEXT NOT NULL DEFAULT 'synced' CHECK (sync_state IN ('synced','pending')),
    PRIMARY KEY (user_id, key)
  );

  CREATE TABLE favorite_sets (
    user_id    TEXT NOT NULL,
    key        TEXT NOT NULL,
    sync_state TEXT NOT NULL DEFAULT 'synced' CHECK (sync_state IN ('synced','pending')),
    PRIMARY KEY (user_id, key)
  );

  CREATE TABLE outbox (
    seq        INTEGER PRIMARY KEY AUTOINCREMENT,
    op_id      TEXT NOT NULL UNIQUE,
    user_id    TEXT NOT NULL,
    kind       TEXT NOT NULL,
    entity_key TEXT NOT NULL,
    payload    TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','failed','blocked')),
    attempts   INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX outbox_user_idx ON outbox(user_id, status, seq);
  CREATE UNIQUE INDEX outbox_entity_uq
    ON outbox(user_id, kind, entity_key) WHERE kind IN ('wishlist','favorite');
  `,
    `
  CREATE TABLE rarities (
    name                    TEXT PRIMARY KEY NOT NULL,
    icon_url                TEXT NOT NULL,
    icon_version            TEXT,
    icon_local_path         TEXT,
    icon_downloaded_version TEXT
  );
  `,
    `
  CREATE TABLE image_files (
    url       TEXT PRIMARY KEY NOT NULL,
    kind      TEXT NOT NULL,
    file_name TEXT NOT NULL,
    bytes     INTEGER NOT NULL DEFAULT 0,
    pinned    INTEGER NOT NULL DEFAULT 0,
    last_used TEXT NOT NULL
  );
  CREATE INDEX image_files_lru_idx ON image_files(pinned, last_used);
  `,
    `
  CREATE TABLE image_misses (
    url        TEXT PRIMARY KEY NOT NULL,
    status     INTEGER NOT NULL,
    checked_at TEXT NOT NULL
  );
  `,
      `
  CREATE TABLE species (
    dex_id      INTEGER PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    image_url   TEXT NOT NULL
  );
  CREATE TABLE regions (
    id         TEXT PRIMARY KEY NOT NULL,
    name       TEXT NOT NULL,
    dex_start  INTEGER NOT NULL,
    dex_end    INTEGER NOT NULL,
    sort_order INTEGER NOT NULL
  );
  CREATE TABLE card_dex (
    card_id TEXT NOT NULL,
    dex_id  INTEGER NOT NULL,
    PRIMARY KEY (card_id, dex_id)
  );
  CREATE INDEX card_dex_dex_idx ON card_dex(dex_id);
  CREATE TABLE pokemon_cards_cached (
    dex_id    INTEGER PRIMARY KEY NOT NULL,
    cached_at TEXT NOT NULL
  );
  INSERT OR IGNORE INTO card_dex (card_id, dex_id)
  SELECT c.id, CAST(j.value AS INTEGER)
  FROM cards c, json_each(c.detail, '$.dex_ids') AS j
  WHERE c.detail IS NOT NULL AND json_valid(c.detail);
  `,
];

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  for (let v = row?.user_version ?? 0; v < MIGRATIONS.length; v++) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(MIGRATIONS[v]);
      await tx.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return db;
}

let pending: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  pending ??= open().catch((err) => {
    pending = null;
    throw err;
  });
  return pending;
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

type TxTask = Parameters<SQLite.SQLiteDatabase['withExclusiveTransactionAsync']>[0];
export type Tx = Parameters<TxTask>[0];

const isBusy = (e: unknown) => /database is locked|SQLITE_BUSY|code 5/i.test(String((e as Error)?.message));

export async function withRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!isBusy(e) || i >= tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 100 * 2 ** i));
    }
  }
}

export async function runTx(task: TxTask): Promise<void> {
  const db = await getDb();
  return withRetry(() => db.withExclusiveTransactionAsync(task));
}