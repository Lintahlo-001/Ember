// Manually replace an image (webp only):
//   npm run replace:image -- --card=swsh3-136 ./fixed.webp
//   npm run replace:image -- --set=swsh3 --kind=logo ./logo.webp     (kind: logo | symbol)
// Uploads to Storage, bumps the version, flags the set, and locks the row so the
// daily recheck won't overwrite it. To hand it back to TCGdex:
//   UPDATE catalog.cards SET images_locked=false, image_etag=NULL, image_last_modified=NULL WHERE id='...';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { pool } from '../db';
import { MIRROR_PREFIX, uploadFallback } from '../storage';

const args = process.argv.slice(2);
const opt = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const file = args.find((a) => !a.startsWith('--'));
const ID_RE = /^[A-Za-z0-9._-]{1,40}$/;

async function main() {
  if (!file) throw new Error('Pass a .webp file path');
  const bytes = await readFile(file);
  const isWebp = bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!isWebp) throw new Error('File is not a WebP image');
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const version = createHash('sha1').update(bytes).digest('hex').slice(0, 8);

  const cardId = opt('card');
  const setId = opt('set');

  if (cardId) {
    if (!ID_RE.test(cardId)) throw new Error('Invalid card id');
    const { rows } = await pool.query('SELECT set_id, image_path FROM catalog.cards WHERE id = $1', [cardId]);
    if (!rows[0]) throw new Error(`Unknown card ${cardId}`);
    const path: string = rows[0].image_path ?? `${MIRROR_PREFIX}cards/${cardId}.webp`;
    await uploadFallback(path, buf, 'image/webp');
    await pool.query(
      `UPDATE catalog.cards
       SET image_path = $2, image_version = $3, images_locked = true, image_checked_at = now()
       WHERE id = $1`,
      [cardId, path, version],
    );
    await pool.query('UPDATE catalog.sets SET images_updated_at = now() WHERE id = $1', [rows[0].set_id]);
    console.log(`Replaced ${cardId} -> ${path} (v=${version}), locked.`);
    return;
  }

  if (setId) {
    const kind = opt('kind');
    if (!ID_RE.test(setId)) throw new Error('Invalid set id');
    if (kind !== 'logo' && kind !== 'symbol') throw new Error('--kind must be logo or symbol');
    const { rows } = await pool.query(`SELECT ${kind}_path AS path FROM catalog.sets WHERE id = $1`, [setId]);
    if (!rows.length) throw new Error(`Unknown set ${setId}`);
    const path: string = rows[0].path ?? `${MIRROR_PREFIX}sets/${setId}/${kind}.webp`;
    await uploadFallback(path, buf, 'image/webp');
    await pool.query(
      `UPDATE catalog.sets
       SET ${kind}_path = $2, ${kind}_version = $3, images_updated_at = now()
       ${kind === 'logo' ? ", logo_source = COALESCE(logo_source, 'tcgdex')" : ''}
       WHERE id = $1`,
      [setId, path, version],
    );
    console.log(`Replaced ${setId} ${kind} -> ${path} (v=${version}), locked.`);
    return;
  }

  throw new Error('Pass --card=<id> or --set=<id> --kind=logo|symbol');
}

main()
  .catch((err) => { console.error('Replace failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());