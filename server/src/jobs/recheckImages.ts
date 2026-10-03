// One-off baseline: `npm run recheck:images -- --limit=20000`. Safe to Ctrl-C and re-run.
import { pool } from '../db';
import { recheckImages } from '../imageRecheck';

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 1000;

recheckImages(limit)
  .then((s) => console.log(s))
  .catch((err) => { console.error('Recheck failed:', err); process.exitCode = 1; })
  .finally(() => pool.end());