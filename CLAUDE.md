# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm i` — install dependencies.
- `npm run dev` — start the Next.js dev server.
- `npm run build` — production build via `next build`.
- `npm run start` — serve the production build via `next start`.
- `npm run typecheck` — TypeScript strict-mode check via `tsc --noEmit` (uses [tsconfig.json](tsconfig.json)).
- `supabase db push` — apply pending DB migrations to the linked Supabase project ([supabase/README.md](supabase/README.md)).

No lint or test scripts are configured.

## Architecture

A **Next.js 15 (App Router) + React 18 + TypeScript** full-stack app for weather-based fashion recommendations. UI strings are Korean. Originally a Figma Make Vite export; the Vite/`figma:asset` stack has been fully removed (see umbrella issue #15).

### Page routing
App Router lives in [app/](app/):
- [app/page.tsx](app/page.tsx) → renders `<Dashboard />`
- [app/admin/page.tsx](app/admin/page.tsx) → renders `<AdminDashboard />`
- [app/layout.tsx](app/layout.tsx) is the root layout (imports `@/styles/index.css`)

`Dashboard` and `AdminDashboard` are **Client Components** (`"use client"` at the top of [src/app/components/Dashboard.tsx](src/app/components/Dashboard.tsx) and [src/app/components/AdminDashboard.tsx](src/app/components/AdminDashboard.tsx)) and use `useRouter()` from `next/navigation` — no callback prop drilling. Dashboard receives initial weather + fashion data via SSR ([app/page.tsx](app/page.tsx) is an async Server Component).

### Admin auth (stateful sessions in Supabase)
`/admin/*` (except `/admin/login`) and `POST` / `DELETE` on `/api/fashion` are gated by [middleware.ts](middleware.ts), which validates an `admin_session` cookie against Supabase. `GET /api/fashion` is intentionally public so the home Dashboard works for anonymous visitors. Auth is **not** Supabase Auth — the app uses its own `admins` / `sessions` tables ([supabase/migrations/](supabase/migrations/)) and a small scrypt-based helper in [src/lib/server/auth.ts](src/lib/server/auth.ts). The login form lives at [app/admin/login/page.tsx](app/admin/login/page.tsx) and posts to [app/api/auth/login/route.ts](app/api/auth/login/route.ts); logout is the AdminDashboard header button calling [app/api/auth/logout/route.ts](app/api/auth/logout/route.ts). Sessions expire after 7 days; rotating `SUPABASE_SERVICE_ROLE_KEY` does **not** invalidate sessions — delete rows from `public.sessions` to do that. The Supabase service-role client at [src/lib/server/supabase.ts](src/lib/server/supabase.ts) imports `"server-only"` and must never appear in a Client Component import chain.

Required env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ([.env.example](.env.example)). Setup workflow + test admin credentials are in [supabase/README.md](supabase/README.md).

### Data layer (Next.js Route Handler → MongoDB Atlas)
Browser code calls **same-origin `/api/fashion`** ([app/api/fashion/route.ts](app/api/fashion/route.ts)), which reads/writes **MongoDB Atlas** directly via [src/lib/server/fashionRepo.ts](src/lib/server/fashionRepo.ts). The connection is a cached `MongoClient` in [src/lib/server/mongodb.ts](src/lib/server/mongodb.ts) (global promise so Vercel/serverless lambdas reuse it); both import `"server-only"` and must never appear in a Client Component import chain. Data lives in the **`fashion_items`** collection of the **`fashion`** DB; each document is a `FashionItem` keyed by a string `id` (unique index), with `_id` projected out on read.

- `MONGODB_URI` — Atlas connection string (contains the password)
- `MONGODB_DB` — DB name (optional, default `fashion`)

See [.env.example](.env.example) for the local-dev template; copy to `.env.local` (gitignored). On Vercel, set the same vars in Project Settings. **Never** put `MONGODB_URI` in client code or prefix it with `NEXT_PUBLIC_` — the credentials would leak to the browser bundle.

> The data was migrated from a Google Sheet (`fashion_data`) via [scripts/migrate-sheet-to-mongo.mjs](scripts/migrate-sheet-to-mongo.mjs). The legacy Apps Script + Sheets stack (and its `APPS_SCRIPT_*` env, [openapi.yaml](openapi.yaml), `API_SETUP.md`) is no longer used at runtime.

The client wrapper [src/app/services/fashionApi.ts](src/app/services/fashionApi.ts) only knows about `/api/fashion`:
- `GET /api/fashion?weather=<w>` → list filtered by weather
- `GET /api/fashion` → list all
- `POST /api/fashion` (body = `Partial<FashionItem>`) → upsert
- `DELETE /api/fashion?id=<id>` → delete

`serverListFashion` filters by `weather` only (server-side); `serverUpsertFashion` upserts by `id` (generating `LOOK_<uuid>` when absent) and stamps `updated_at`; `serverDeleteFashion` removes by `id`. All three return the same `ApiResponse<T>` shape the client expects. `temperature_band` is **not** stored — the client computes bands from `temperature_*_c` (see filter pipeline below).

### Filter pipeline (non-obvious)
[src/app/components/Dashboard.tsx](src/app/components/Dashboard.tsx) deliberately splits filtering between server and client:

1. Only `weather` is sent to the API (`getFashionByWeather`) — gender and temperature filters are **not** server-side.
2. The client computes a `TempBand` (`freezing`/`cold`/`cool`/`mild`/`warm`/`hot`) from the current temperature via `getTempBand()` at [Dashboard.tsx:191](src/app/components/Dashboard.tsx#L191). Band thresholds: `≤0 / ≤9 / ≤16 / ≤22 / ≤27 / >27`.
3. Each item's band is derived by `getItemTempBand()` from the first available of `temperature_avg_c`, `temperature_feels_like_c`, `temperature_max_c`, `temperature_min_c` — the stored `temperature_band` column is ignored. Items with **none** of these numeric values bypass the band check and render with a gray "기온 무관" badge.
4. Final filter: `(itemBand === null || itemBand === currentWeatherBand) && item.gender === selectedGender`.

If you change band thresholds, update both `getTempBand` and `tempBandConfig` (display labels/ranges) so they stay in sync.

### UI stack
- shadcn/ui components live in [src/app/components/ui/](src/app/components/ui/) (imported via the `cn()` helper in [ui/utils.ts](src/app/components/ui/utils.ts)).
- Tailwind v4 runs through `@tailwindcss/postcss` (registered in [postcss.config.mjs](postcss.config.mjs)); Next.js's build pipeline picks it up. Styles are entered via [src/styles/index.css](src/styles/index.css) (imported once from [app/layout.tsx](app/layout.tsx)), which `@import`s `fonts.css`, `tailwind.css`, and `theme.css`. The `@source` directive in `tailwind.css` scans **both** `src/` and `app/`.
- Radix UI, MUI, and shadcn are all present. New UI work should prefer the existing shadcn primitives in `components/ui/` over adding new Radix/MUI usage.

### Path alias
`@/*` → `./src/*` (in [tsconfig.json](tsconfig.json)). Note this does NOT cover the root `app/` directory — import from `app/` using relative paths or full route paths.

## Required field values
When working with fashion items, these fields have constrained vocabularies (enforced by the `FashionItem` type and used as filter keys):
- `weather`: `sunny | cloudy | rainy | snowy | windy | foggy`
- `gender`: `male | female | unisex`
- `fashion_category`: `casual | street | minimal | formal | sporty | business | date | travel`

`temperature_band` is **not** persisted (the migration drops it); the client-side `TempBand` is derived from `temperature_*_c`. `active: false` items are excluded after fetch.
