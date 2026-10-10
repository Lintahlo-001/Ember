# Security checklist

## Secrets and credentials

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 1 | `.env` is gitignored and is not in the repository | Yes | `.gitignore` ignores `.env`, `.env.*` (with `!.env.example` as the only exception) and `**/server/.env`. |
| 2 | A `.env.example` with placeholder values only is committed | Yes | Root `.env.example` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL`) and `server/.env.example` (`SUPABASE_*`, `DATABASE_URL`, `POKEWALLET_API_KEY`, `CRON_SECRET`) contain placeholders only (`your-secret-key`, `pk_live_your_key_here`, `generate-a-long-random-string`). |
| 3 | No connection string, key, token or password is hardcoded in source, comments or commented-out code | Yes | Every secret is read from `process.env`: `server/src/db.ts` (`DATABASE_URL`), `auth.ts` (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`), `storage.ts` (`SUPABASE_SECRET_KEY`), `pokewallet.ts` (`POKEWALLET_API_KEY`), `routes/internalSync.ts` (`CRON_SECRET`). The app reads `EXPO_PUBLIC_*` in `src/lib/supabase.ts` and `src/lib/api.ts`. `render.yaml` lists variable names only (`sync: false`), no values. The only literals left are non-secret (EAS `projectId`, the PokeWallet set-override id). `.gitignore` also covers signing keys (`*.jks`, `*.p8`, `*.p12`, `*.key`, `*.mobileprovision`). |
| 4 | Git history is clean: I searched `git log -p` for password, secret, api key and `postgres://` | Yes | Reviewed full git log -p output. Every match is either a placeholder value (user:pass, your-password, your-project-ref) or a code identifier (signInWithPassword, ChangePassword, forgotPasswordText, form labels like "current password"). No real credential value appears in any commit. |
| 5 | Any credential that was ever committed has been rotated | Yes | service_role key and DB password were pasted into AI chat, not committed to git, both rotated via Supabase dashboard (Settings, API / Settings, Database) immediately after, before use in server/.env |
| 6 | Production credentials live only in my hosting provider's environment settings | Yes | `render.yaml` declares all seven server variables (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `POKEWALLET_API_KEY`, `CORS_ORIGINS`, `CRON_SECRET`) with `sync: false`, so values are entered in the Render dashboard only. `EXPO_PUBLIC_*` values are set as EAS environment variables for cloud builds. The publishable key is public by design; the secret key never reaches the app. |

## GitHub Actions

The project has no workflows, so every row is N/A.

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 7 | No secret value is written literally in any workflow YAML file | N/A | No workflows exist |
| 8 | Secrets are stored in repository Actions secrets and read with `${{ secrets.NAME }}` | N/A | No workflows exist |
| 9 | No workflow step echoes, dumps or debug-prints a secret, and I opened a recent run's log to confirm | N/A | No workflows exist |
| 10 | Uploaded build artifacts contain no `.env`, key file or generated config | N/A | No workflows exist |
| 11 | Third-party actions are pinned to a commit SHA, not a moveable tag | N/A | No workflows exist |
| 12 | Secret scanning and push protection are enabled on the repository | N/A | No workflows exist. The repo is public, though, so GitHub's free secret scanning and push protection are worth switching on anyway (Settings, Code security). |

## Database

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 13 | Every query taking user input uses parameters, never string concatenation | Yes | **Express:** every route passes input as `$n` parameters (`routes/catalog.ts`, `pokedex.ts`, `pricing.ts`). The search `ILIKE` pattern has `\`, `%` and `_` escaped before it is bound (`ESCAPE '\\'`). `ids` arrays use `= ANY($1::text[])`. The few template-string queries only interpolate fixed internal values: `cliFilters.setFilterSql` takes a literal `'id' \| 'set_id'`, `replaceImage.ts` interpolates `kind` only after checking it is `logo` or `symbol`, `sync.reconcileFallback` takes literal table and column names, and `fallbackSweep` interpolates a constant interval. **App (SQLite):** values are bound with `?`, and the dynamic `SET` column list in `ownership.updateEntry` comes from a fixed whitelist. **Supabase:** writes go through PostgREST and the `add_ownership_entry` RPC with typed parameters. |
| 14 | The database is not open to the whole internet, or is reachable only by the app | No | The Supabase pooler is reachable with the connection string alone; no network restrictions are configured. Render's free tier has no fixed outbound IP, so IP allow-listing isn't practical yet. Related: `server/src/db.ts` sets `ssl: { rejectUnauthorized: false }`, which encrypts the connection but skips certificate verification. |
| 15 | The database user the app connects as has only the permissions it needs | No | `DATABASE_URL` still connects as Supabase's default postgres.<ref> role, which has full project access rather than being scoped to app tables. A least-privilege role is planned before real ownership/wishlist data goes live.Unchanged. `DATABASE_URL` still uses the default `postgres.<ref>` role, which bypasses RLS and has full access. This is partly mitigated: user data is never read or written through Express. The app talks to Supabase directly with the user's JWT under RLS, so Express only touches `catalog.*` and Storage. A dedicated role with grants on `catalog` only is the remaining fix. |
| 16 | Seed and sample data is invented, not real people's data | Yes | The only seed data is public reference data: `seedspecies.ts` (PokeAPI species), `009_pokemon_species.sql` (region ranges) and the TCGdex catalog sync. No real person's data is seeded. |
| 17 | Debug, seed and reset routes are removed before going public | Yes | The server exposes `GET /health` (no input, no sensitive output) and `POST /internal/sync`. The sync route is guarded by a `CRON_SECRET` bearer token: minimum 24 characters, compared with `timingSafeEqual`, 401 otherwise, 409 if already running. |

## Access control

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 18 | The app has an access layer: Cloudflare Zero Trust, an app-level password, or a real login | Yes | Supabase auth (email/password and Google OAuth). `src/app/index.tsx` sends logged-out users to `/(auth)/welcome`, and the data layer throws "You are signed out" without a session (`userScope.currentUser`, `api.request`). The real gate is server-side (`requireAuth`) plus RLS. |
| 19 | If Supabase or Firebase: Row Level Security or security rules are on, and I tested it signed out | Yes | RLS is enabled on `ownership_entries`, `wishlist_entries`, `favorite_sets` and `applied_ops` (`004`, `005`, `006`, `008`), each with own-rows policies `TO authenticated` using `(SELECT auth.uid()) = user_id`. `anon` has `REVOKE ALL`, and no UPDATE grant exists on wishlist or favorites. The `catalog` schema is revoked from `anon` and `authenticated` with RLS on (`001`, `009`, `011`). The `add_ownership_entry` RPC is `SECURITY INVOKER` with a fixed `search_path` and `EXECUTE` revoked from `anon`. |
| 20 | If Zero Trust: on the access policy. If an app password: the credentials are in my private workspace | N/A | Neither applies; Supabase auth is used instead. |
| 21 | The gate covers every route, including the ones that only change data | Yes | `server/src/index.ts` mounts `/health` and `internalSyncRouter` first, then `app.use(requireAuth)` ahead of `catalogRouter`, `pokedexRouter` and `pricingRouter`. Every other route, including the POST routes (`/cards/batch`, `/cards/details`, `/cards/prices`, `/sets/:id/changes`), sits behind it. The only exceptions are the intentionally public `/health` and the secret-guarded `/internal/sync`. Data-changing user actions don't go through Express at all: the app writes straight to Supabase under RLS with the user's JWT. |
| 22 | The credentials for the gate are environment variables, not in source | Yes | `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` come from env (`src/lib/supabase.ts`); `SUPABASE_*` and `CRON_SECRET` come from server env. `.env` files are gitignored. |

## Input and output

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 23 | Input from the user is validated on the server, not only in the browser | Yes | **Express:** `ID_RE` on every set, card and batch id; `VARIANT_RE`; search `q` ≤ 100 and `artist` ≤ 120 characters; suggest `q` ≤ 100; batch caps (200 ids, 50 for details); `/sets/:id/changes` validates up to 2000 `[id, version, syncedAt]` triples (version regex, parseable date); dex id regex `^\d{1,4}$` and range check; body limits of 10 KB (100 KB on `/changes`); query params are type-checked as strings. **Database:** CHECK constraints on `ownership_entries` (card id and variant regex, condition enum, quantity 1 to 9999, notes ≤ 500) and on wishlist and favorite ids, so validation doesn't depend on the app. |
| 24 | User-supplied text is escaped when rendered, so it cannot inject markup or script | Yes | No `dangerouslySetInnerHTML`, no WebView and no HTML templating in the files reviewed. Notes, usernames and search text all render through React Native `<Text>`, which doesn't interpret markup. |
| 25 | Error responses do not expose stack traces, file paths or connection details | Yes | The global handler in `server/src/index.ts` logs the error server-side and returns `{ error: 'Internal server error' }`. `/health` returns a generic message on failure. Route 4xx messages are fixed strings. The app's `api.ts` maps failures to generic messages. Minor: malformed JSON bodies surface as a 500 rather than a 400 because the handler doesn't keep `err.status`. |
| 26 | CORS is not a wildcard on routes that change data | Yes | `server/src/index.ts` uses `cors({ origin: allowedOrigins })`, an allow-list from `CORS_ORIGINS` (default `http://localhost:8081` only when the variable is unset; an empty value allows nothing). The native app sends no `Origin` header, so it isn't affected. |

## Repository and privacy

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 27 | No student number, personal email, phone number or home address in the repository or in commit messages | Yes | None found. |
| 28 | No classmate's personal data in the repository | Yes | None found. |
| 29 | Dependencies come from official registries, and `node_modules` is gitignored | Yes | `node_modules/` is gitignored and `server/package-lock.json` resolves only from `registry.npmjs.org`. |
| 30 | Images, fonts and other assets are mine, licensed, or credited | Yes | The Settings page includes an About and Credits section that acknowledges TCGdex, Pokéwallet, and PokéAPI, as well as the Pokémon trademark owners: Nintendo, Creatures Inc., and GAME FREAK inc. Card images, logos, and artwork are sourced from these services or mirrored in a Supabase storage bucket. The fonts used, Anton and Work Sans, are open-licensed. |
| 31 | Repository visibility is deliberate, and I checked it after my last push | Yes | Public, intentional. |

## Anything I found and fixed

This was an audit-only pass against the files; no code was changed. Things the audit also noticed that aren't on the checklist: the Supabase session lives in AsyncStorage and the SQLite database holds the user's collection, both unencrypted at rest, and `server/src/index.ts` mounts `catalogRouter` and `pokedexRouter` twice, which I fixed afterward.