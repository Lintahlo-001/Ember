// Batch-upload rarity icons from a folder:
//   npm run upload:rarities -- ../assets/images/rarity-icons --dry-run
//   npm run upload:rarities -- ../assets/images/rarity-icons
// A file is matched to a rarity by name: lowercase, non-alphanumerics -> "-".
//   "Double rare" <-> double-rare.webp,  "Illustration rare" <-> illustration-rare.png
// Accepts .webp and .png (max 512 KB). Re-runnable: unchanged files (same content hash) are skipped.
// If a file's extension changes, the old object is deleted after the new one is saved.
// To remove an icon: UPDATE catalog.rarities SET icon_path = NULL, icon_version = NULL WHERE name = '...';
import { createHash } from 'crypto';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { pool } from '../db';
import { deleteRarityIcon, uploadRarityIcon } from '../storage';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dir = args.find((a) => !a.startsWith('--'));
const MAX_BYTES = 2 * 1024 * 1024;

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function kindOf(b: Buffer): { ext: 'webp' | 'png'; type: string } | null {
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP')
    return { ext: 'webp', type: 'image/webp' };
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { ext: 'png', type: 'image/png' };
  return null;
}

type RarityRow = { name: string; icon_path: string | null; icon_version: string | null };

async function main() {
  if (!dir) throw new Error('Pass a folder: npm run upload:rarities -- ./rarity-icons [--dry-run]');

  const { rows } = await pool.query<RarityRow>('SELECT name, icon_path, icon_version FROM catalog.rarities');
  const bySlug = new Map<string, RarityRow>();
  for (const r of rows) {
    const s = slug(r.name);
    if (bySlug.has(s)) throw new Error(`Two rarities share the slug "${s}": fix by hand first`);
    bySlug.set(s, r);
  }

  const files = (await readdir(dir)).filter((f) => /\.(webp|png)$/i.test(f)).sort();
  const seen = new Set<string>();
  let uploaded = 0, unchanged = 0, failed = 0;
  const unmatched: string[] = [];

  for (const file of files) {
    const s = slug(path.parse(file).name);
    const row = bySlug.get(s);
    if (!row) { unmatched.push(file); continue; }
    if (seen.has(s)) { console.error(`SKIP ${file}: another file already maps to "${row.name}"`); failed++; continue; }
    seen.add(s);

    try {
      const bytes = await readFile(path.join(dir, file));
      if (bytes.length > MAX_BYTES) throw new Error('over 2 MB');
      const kind = kindOf(bytes);
      if (!kind) throw new Error('not a WebP or PNG');

      const newPath = `${s}.${kind.ext}`;
      const version = createHash('sha1').update(bytes).digest('hex').slice(0, 8);

      if (row.icon_path === newPath && row.icon_version === version) { unchanged++; continue; }
      console.log(`${dryRun ? 'WOULD UPLOAD' : 'UPLOAD'} ${file} -> ${newPath} (v=${version}) for "${row.name}"`);
      if (dryRun) { uploaded++; continue; }

      const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      await uploadRarityIcon(newPath, buf, kind.type);
      await pool.query(
        'UPDATE catalog.rarities SET icon_path = $2, icon_version = $3, icon_updated_at = now() WHERE name = $1',
        [row.name, newPath, version],
      );
      if (row.icon_path && row.icon_path !== newPath) {
        await deleteRarityIcon(row.icon_path).catch((e) => console.error('  old file not deleted:', e.message));
      }
      uploaded++;
    } catch (err) {
      failed++;
      console.error(`FAILED ${file}:`, (err as Error).message);
    }
  }

  console.log(`\n${uploaded} ${dryRun ? 'to upload' : 'uploaded'}, ${unchanged} unchanged, ${failed} failed`);
  if (unmatched.length) console.log(`No matching rarity for: ${unmatched.join(', ')}`);

  const { rows: missing } = await pool.query(
    'SELECT name FROM catalog.rarities WHERE icon_path IS NULL ORDER BY name',
  );
  if (missing.length) console.log(`Rarities still without an icon: ${missing.map((m) => m.name).join(', ')}`);
  if (failed) process.exitCode = 1;
}

main()
  .catch((err) => { console.error('Upload failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());