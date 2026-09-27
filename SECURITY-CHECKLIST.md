# Security checklist

## Secrets and credentials

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 1 | `.env` is gitignored and is not in the repository | Yes | .gitignore line 69, 72 (.env block); git status confirms server/.env never appears as trackable |
| 2 | A `.env.example` with placeholder values only is committed | Yes | server/.env.example, all values are placeholders (your-project-ref, your-password, etc.), no real credentials |
| 3 | No connection string, key, token or password is hardcoded in source, comments or commented-out code | Yes | server/src/db.ts reads only from process.env.DATABASE_URL; .gitignore extended to also cover native signing keys (*.jks, *.p8, *.p12, *.key, *.mobileprovision) before any exist |
| 4 | Git history is clean: I searched `git log -p` for password, secret, api key and `postgres://` | Yes | Reviewed full `git log -p` output. Every match is either a placeholder value (`user:pass`, `your-password`, `your-project-ref`) or a code identifier (`signInWithPassword`, `ChangePassword`, `forgotPasswordText`, form labels like "current password"). No real credential value appears in any commit. |
| 5 | Any credential that was ever committed has been rotated | Yes | service_role key and DB password were pasted into AI chat, not committed to git, both rotated via Supabase dashboard (Settings, API / Settings, Database) immediately after, before use in server/.env |
| 6 | Production credentials live only in my hosting provider's environment settings | Yes | EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY are set via EAS env vars, not just local .env, before running cloud builds. |

## GitHub Actions

If your project has no workflows, mark every row N/A and say so once.

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 7 | No secret value is written literally in any workflow YAML file | N/A | No workflows exist |
| 8 | Secrets are stored in repository Actions secrets and read with `${{ secrets.NAME }}` | N/A | No workflows exist |
| 9 | No workflow step echoes, dumps or debug-prints a secret, and I opened a recent run's log to confirm | N/A | No workflows exist |
| 10 | Uploaded build artifacts contain no `.env`, key file or generated config | N/A | No workflows exist |
| 11 | Third-party actions are pinned to a commit SHA, not a moveable tag | N/A | No workflows exist |
| 12 | Secret scanning and push protection are enabled on the repository | N/A | No workflows exist |

## Database

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 13 | Every query taking user input uses parameters, never string concatenation | N/A | Only query in the codebase is `pool.query('SELECT NOW()')`, which takes no user input. No route accepts user input yet. Revisit once card/ownership routes are built. |
| 14 | The database is not open to the whole internet, or is reachable only by the app | No | No network/IP restriction is configured on the Supabase project; it's reachable via the pooler connection string alone. Worth revisiting before the app starts handling real user data at scale. |
| 15 | The database user the app connects as has only the permissions it needs | No | `DATABASE_URL` still connects as Supabase's default `postgres.<ref>` role, which has full project access rather than being scoped to app tables. A least-privilege role is planned before real ownership/wishlist data goes live. |
| 16 | Seed and sample data is invented, not real people's data | N/A | No schema or data exists in Postgres yet |
| 17 | Debug, seed and reset routes are removed before going public | Yes | server/src/index.ts exposes only `GET /health` (no input, no sensitive output) |

## Access control

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 18 | The app has an access layer: Cloudflare Zero Trust, an app-level password, or a real login | Yes | Supabase auth now gates the tab bar, `_layout.tsx` redirects to the auth stack when logged out |
| 19 | If Supabase or Firebase: Row Level Security or security rules are on, and I tested it signed out | No | No app-owned Supabase table exists yet (e.g. a `profiles` or ownership table), so there is nothing to apply RLS to yet. RLS will be added and tested signed-out as soon as that table is built. |
| 20 | If Zero Trust: on the access policy. If an app password: the credentials are in my private workspace | N/A | Neither applies, a real auth system (Supabase) is in use instead of Zero Trust or a shared app password |
| 21 | The gate covers every route, including the ones that only change data | N/A | No data-changing route exists yet; Express currently only serves the unauthenticated `/health` check. Revisit once ownership/wishlist routes are built, they'll need an auth check added. |
| 22 | The credentials for the gate are environment variables, not in source | Yes | Client keys are `EXPO_PUBLIC_*` env vars, `.env` gitignored |

## Input and output

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 23 | Input from the user is validated on the server, not only in the browser | N/A | No server route accepts user input yet. Revisit once real routes (ownership entries, wishlist, account changes) are built. |
| 24 | User-supplied text is escaped when rendered, so it cannot inject markup or script | Yes | No `dangerouslySetInnerHTML`, no WebView rendering untrusted HTML, no raw HTML templating anywhere in the app, React Native's `<Text>` doesn't interpret markup, so user-entered strings can't inject anything |
| 25 | Error responses do not expose stack traces, file paths or connection details | Yes | server/src/index.ts /health route: real error logged server-side only (console.error), client response is a generic `{ status: 'error', message: 'Database unreachable' }` |
| 26 | CORS is not a wildcard on routes that change data | No | `server/src/index.ts` uses `app.use(cors())` with no origin restriction. Only fronts `/health` today, but needs tightening to a specific origin before any data-changing route ships. |

## Repository and privacy

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 27 | No student number, personal email, phone number or home address in the repository or in commit messages | Yes | Nothing committed |
| 28 | No classmate's personal data in the repository | Yes | Nothing committed |
| 29 | Dependencies come from official registries, and `node_modules` is gitignored | Yes | `.gitignore` excludes `node_modules/`; both `package.json` files pull only from the public npm registry |
| 30 | Images, fonts and other assets are mine, licensed, or credited | N/A | Nothing currently in the app requires attribution. Revisit if/when card images, custom art, or other third-party assets are added. |
| 31 | Repository visibility is deliberate, and I checked it after my last push | Yes | Public, intentional |

## Anything I found and fixed

Nothing was fixed during this review, it was an audit-only pass, no code was touched. What it did catch, that I haven't flagged before: Express's CORS is currently wide open (`cors()` with no origin restriction), and the database connection still runs as Supabase's default `postgres` role rather than an app-scoped least-privilege one. Both are fine at this stage since no data-changing routes exist yet, but they're now tracked here as planned fixes before the app starts writing real user data through Express.