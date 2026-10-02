// Shared --set / --exclude-set handling for the mirror and purge jobs.
//   --set=swsh3,swsh4          only these sets
//   --exclude-set=base1,base2  everything except these (wins if a set is in both)
import { pool } from '../db';

const ID_RE = /^[A-Za-z0-9._-]{1,40}$/;

function idList(args: string[], name: string): string[] | null {
  const raw = args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (!raw) return null;
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const bad = ids.find((id) => !ID_RE.test(id));
  if (bad) throw new Error(`--${name}: invalid set id "${bad}"`);
  return ids.length > 0 ? ids : null;
}

export function parseSetFilter(args: string[]) {
  return { only: idList(args, 'set'), skip: idList(args, 'exclude-set') };
}

export const setFilterSql = (col: 'id' | 'set_id') =>
  `AND ($1::text[] IS NULL OR ${col} = ANY($1::text[]))
   AND ($2::text[] IS NULL OR NOT (${col} = ANY($2::text[])))`;

export async function assertKnownSets(...lists: (string[] | null)[]) {
  const ids = [...new Set(lists.flatMap((l) => l ?? []))];
  if (ids.length === 0) return;
  const { rows } = await pool.query('SELECT id FROM catalog.sets WHERE id = ANY($1::text[])', [ids]);
  const known = new Set(rows.map((r) => r.id));
  const unknown = ids.filter((i) => !known.has(i));
  if (unknown.length > 0) throw new Error(`Unknown set id(s): ${unknown.join(', ')}`);
}