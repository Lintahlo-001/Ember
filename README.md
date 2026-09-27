# Ember (WIP)
# Some placeholder texts below fr

## Overview
Ember is a mobile Pokémon card collection tracker built for collectors who want an organized digital record of the physical cards they own. It lets users search for cards, track ownership details such as quantity, condition, and variant, manage a wishlist, and browse Pokémon and card sets to see their collection progress.

The app is built with React Native and Expo for the mobile frontend, with an Express/Node.js backend, PostgreSQL for cached Pokémon card data, and Supabase for authentication and private user collection data.

## Setup and installation

This is currently scoped to **local development only** (no published build yet).

**Prerequisites**
- Node.js 22+ and npm
- Expo Go app (Android) or an Android emulator, via Android Studio — Ember targets Android only, portrait-only, per the design spec
- A [Supabase](https://supabase.com) project (used for both auth/user data and the Postgres mirror cache — see [Tech stack](#tech-stack) note below)

**Clone the repo**
```bash
git clone https://github.com/Lintahlo-001/Ember.git
cd ember
```

**Install dependencies**

The app and the server are separate `package.json`s:
```bash
# from the repo root — installs the Expo/React Native app
npm install

# then the backend
cd server
npm install
cd ..
```

**Environment variables**

Two separate `.env` files are needed, each copied from its `.env.example`:

- Root `.env` (used by the Expo app — see `.env.example`):

  | Variable | Example | Purpose |
  |---|---|---|
  | `EXPO_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase project URL |
  | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase client (anon) key |

- `server/.env` (used by the Express server — see `server/.env.example`):

  | Variable | Example | Purpose |
  |---|---|---|
  | `SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase project URL |
  | `SUPABASE_ANON_KEY` | `your-anon-key` | Supabase client key |
  | `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` | Server-side Supabase key |
  | `DATABASE_URL` | `postgresql://postgres.<ref>:<password>@<pooler-host>.pooler.supabase.com:6543/postgres` | Postgres connection — **use the Supabase pooler, transaction mode, port 6543**, not the direct 5432 connection (see note below) |
  | `PORT` | `3000` | Local server port |
  | `NODE_ENV` | `development` | Environment flag |

  > Ember doesn't stand up a separate local Postgres instance — Supabase's built-in Postgres serves both auth/user data and the TCGdex/PokeAPI mirror cache, logically separated by schema/table rather than by infrastructure. The pooler (transaction mode) is required because Express opens many short-lived connections per request, and Supabase's free tier caps direct connections at 60 vs. 200 pooled. Transaction mode does not support prepared statements — keep that in mind for any future ORM/query builder config.

Never commit either `.env` file — both are already covered by `.gitignore`.

## How to run it

Run the server and the app in two separate terminals.

**1. Start the backend**
```bash
cd server
npm run dev
```
Confirm it's up by hitting `http://localhost:3000/health` — it should return `{ status: 'ok', dbTime: ... }` once it can reach Postgres through the pooler.

**2. Start the Expo app**
```bash
npm start
```
This opens the Expo dev server / QR code. Options:
- `a` — launch directly in an Android emulator or connected device
- `w` — run in a browser (useful for quick UI checks; the app is designed Android-first)

## Features and usage

**Currently implemented**
- **Auth flow:** Welcome → Login / Signup, backed by Supabase (email/password + "Continue with Google"). Signup intentionally does **not** auto-login — it routes back to Login after account creation. Logging in routes to the Dashboard tab.
- **Navigation shell:** 3-tab bottom bar (Wishlist · Dashboard · Pokédex) via a custom floating, blurred `NavBar` that respects Android safe-area insets, plus nested stacks per tab so the bar stays visible on pushed screens (My Cards, Set Detail, etc.).
- **Dashboard (partial):** header with a Settings icon, a search bar entry point (routes to Search Results), and nav cards for My Cards and Statistics.
- **Shared UI primitives:** `Screen` layout wrapper (safe-area + theme background/padding), `Button`, `TextInput`, `FormField`, `SocialAuthButton`, and themed icons (`PokeballIcon`, `PokedexIcon`, `FireSparks`, `WaveFooter`), all driven off the central `src/theme/theme.ts` design tokens.
- **Everything else** — My Cards, Statistics, Set Detail, Set Breakdown, Search Results, Card Detail, Wishlist, Pokédex, Pokémon Detail, Settings, My Account and its Change Username/Email/Password sub-screens, and the Ownership Entry / Pricing Detail modals — exists as routed, navigable screens but is currently a `PlaceholderScreen` (or, for the two modals, a static stub) rather than real functionality.

**Planned**
- Search any Pokémon card and log ownership (quantity, condition, variant, notes), including multiple ownership entries per card.
- Wishlist management.
- Browse card sets (grouped by TCGdex `serie`) and the Pokédex, with owned/total progress tracking throughout.
- Pricing (TCGPlayer/Cardmarket via TCGdex) shown per card, with a detailed price breakdown modal.
- Offline support via on-device SQLite + filesystem image caching, with a manual refresh control and background update checks.
- Account management (change username/email/password) and a replayable first-time onboarding hint.

## Project structure

```
ember/
├── src/
│   ├── app/                          # expo-router file-based routes
│   │   ├── (auth)/                   # welcome, login, signup — auth stack
│   │   ├── (tabs)/                   # wishlist, dashboard, pokedex tabs
│   │   │   ├── dashboard/            # dashboard + its nested stack
│   │   │   │   ├── my-cards.tsx
│   │   │   │   ├── statistics.tsx
│   │   │   │   ├── search-results.tsx
│   │   │   │   ├── set-detail/[setId].tsx
│   │   │   │   ├── set-breakdown/[setId].tsx
│   │   │   │   ├── card-detail/[cardId].tsx
│   │   │   │   └── settings/         # settings + my-account + change-*
│   │   │   ├── wishlist/
│   │   │   └── pokedex/
│   │   │       └── pokemon-detail/[pokemonId].tsx
│   │   ├── modals/                   # ownership-entry, pricing-detail
│   │   └── _layout.tsx               # root stack, fonts, splash screen
│   ├── components/
│   │   ├── atoms/                    # Icon, Button, TextInput, icons/
│   │   ├── molecules/                # FormField, SocialAuthButton
│   │   ├── organisms/                # NavBar
│   │   ├── layout/                   # Screen (safe-area wrapper)
│   │   └── PlaceholderScreen.tsx     # stand-in for unbuilt screens
│   ├── context/                      # AuthContext (Supabase session)
│   ├── lib/                          # supabase client
│   └── theme/                        # theme.ts — design tokens
├── server/
│   ├── src/
│   │   ├── index.ts                  # Express app, /health route
│   │   └── db.ts                     # pg Pool (Supabase pooler)
│   └── .env.example
├── app.json                          # Expo config
├── eas.json                          # EAS build profiles
└── .env.example
```

## Screenshots

(add as you build)

### Initial App Screens

<img src="https://cdn.myimgs.org/images/47160/Screenshot_1790515559.png" alt="Welcome" width="200">
<img src="https://cdn.myimgs.org/images/47161/Screenshot_1790515563.png" alt="Login" width="200">
<img src="https://cdn.myimgs.org/images/47162/Screenshot_1790515565.png" alt="Signup" width="200">

## Known issues and next steps

- **Most screens are placeholders.** Everything past auth and the nav shell (My Cards, Statistics, Set Detail/Breakdown, Search Results, Card Detail, Wishlist, Pokédex, Pokémon Detail, Settings, My Account, the Change ___ screens, and both modals) is routed but not built.
- **No Postgres schema or TCGdex/PokeAPI sync yet.** `server/src/index.ts` only exposes a `/health` check; no `sets`/`cards` tables, no `syncSet()`/`syncCard()`, and no scheduled 24-hour refresh job exist yet.
- **"Forgot Password?" on Login is an intentional no-op** — flagged in-code, waiting on the Change Password sub-screens existing (My Account group) before wiring up a real Supabase deep link.
- **No on-device caching (SQLite/filesystem) or offline queueing yet** — the app currently has no offline story.
- **No pricing integration yet** — no price pill, no Pricing Detail Modal data, no daily batch price sync.