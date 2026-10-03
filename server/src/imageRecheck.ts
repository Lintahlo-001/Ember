import { createHash } from 'crypto';
import { pool } from './db';
import { MIRROR_PREFIX, uploadFallback } from './storage';

const CONCURRENCY = 6;

const versionOf = (etag: string | null, lastModified: string | null): string | null => {
  const basis = etag ?? lastModified;
  return basis ? createHash('sha1').update(basis).digest('hex').slice(0, 8) : null;
};

type Row = {
  id: string;
  image_base: string;
  image_path: string | null;
  image_etag: string | null;
  image_last_modified: string | null;
};

type Outcome = 'unchanged' | 'changed' | 'baselined' | 'missing';

const markChecked = (id: string) =>
  pool.query('UPDATE catalog.cards SET image_checked_at = now() WHERE id = $1', [id]);

async function recheckOne(row: Row): Promise<Outcome> {
  const mirrored = !!row.image_path;
  const headers: Record<string, string> = {};
  if (row.image_etag) headers['If-None-Match'] = row.image_etag;
  if (row.image_last_modified) headers['If-Modified-Since'] = row.image_last_modified;

  const res = await fetch(`${row.image_base}/high.webp`, {
    method: mirrored ? 'GET' : 'HEAD',
    headers,
    signal: AbortSignal.timeout(20_000),
  });

  if (res.status === 304) { await markChecked(row.id); return 'unchanged'; }
  if (res.status === 404) { await markChecked(row.id); return 'missing'; }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const etag = res.headers.get('etag');
  const lastModified = res.headers.get('last-modified');

  if (mirrored) {
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) { await markChecked(row.id); return 'missing'; }
    await uploadFallback(row.image_path!, await res.arrayBuffer(), contentType);
  }

  const version = versionOf(etag, lastModified);
  const hadBaseline = !!(row.image_etag || row.image_last_modified);
  await pool.query(
    `UPDATE catalog.cards
     SET image_etag = $2, image_last_modified = $3,
         image_version = COALESCE($4, image_version), image_checked_at = now()
     WHERE id = $1`,
    [row.id, etag, lastModified, version],
  );
  return hadBaseline ? 'changed' : 'baselined';
}

export async function recheckImages(
  limit = 1000,
): Promise<{ checked: number; changed: number; baselined: number; failed: number }> {
  const { rows } = await pool.query<Row>(
    `SELECT id, image_base, image_path, image_etag, image_last_modified
     FROM catalog.cards
     WHERE image_base IS NOT NULL AND image_base NOT LIKE '%/univ/%'
       AND (image_path IS NULL OR image_path LIKE $2)
     ORDER BY image_checked_at NULLS FIRST, id
     LIMIT $1`,
    [limit, `${MIRROR_PREFIX}%`],
  );

  const tally = { checked: 0, changed: 0, baselined: 0, failed: 0 };
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map(recheckOne));
    results.forEach((r, j) => {
      if (r.status === 'rejected') {
        tally.failed++;
        console.error(`image recheck failed for ${chunk[j].id}:`, r.reason);
        return;
      }
      tally.checked++;
      if (r.value === 'changed') tally.changed++;
      if (r.value === 'baselined') tally.baselined++;
    });
  }
  return tally;
}