# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm i` — install dependencies (pnpm-workspace.yaml is also present; either works, repo declares itself as a single-package workspace).
- `npm run dev` — start the Vite dev server.
- `npm run build` — production build via `vite build`.
- `npm run typecheck` — TypeScript strict-mode check via `tsc --noEmit` (uses [tsconfig.json](tsconfig.json)).

No lint or test scripts are configured.

## Architecture

This is a Figma Make export — a React 18 + Vite + TypeScript SPA for weather-based fashion recommendations. UI strings are Korean.

### Page routing
[src/app/App.tsx](src/app/App.tsx) uses `react-router` v7's `BrowserRouter` + `Routes`: `/` → Dashboard, `/admin` → AdminDashboard, unmatched paths redirect to `/`. Both child components use `useNavigate()` directly — no callback prop drilling.

### Data layer (Google Apps Script + Sheets)
The "backend" is a Google Apps Script Web App backed by a Google Sheet, accessed through [src/app/services/fashionApi.ts](src/app/services/fashionApi.ts). `API_BASE_URL` and `API_TOKEN` are **hard-coded** at the top of that file — there is no env var pipeline (no `.env`, no `import.meta.env.VITE_*` usage anywhere in the repo). Updating either means editing the constants. See [API_SETUP.md](API_SETUP.md) for Apps Script deployment and token generation (`setApiToken()`).

The authoritative API contract — every `action`, request/response schema, and the `NullableNumberLike`/`BooleanLike` quirks of Sheet-backed values — lives in [openapi.yaml](openapi.yaml) (OpenAPI 3.1). If `fashionApi.ts` and `openapi.yaml` disagree, fix whichever side is behind; do not silently diverge. Note that `temperature_band` is intentionally absent from the spec — it is no longer stored/validated server-side, and the client computes bands from `temperature_*_c` (see filter pipeline below).

POST requests use `Content-Type: text/plain;charset=UTF-8` deliberately — this avoids CORS preflight against Apps Script. Don't "fix" it to `application/json`. All fetches use `redirect: "follow"` because Apps Script `/exec` endpoints redirect to `googleusercontent.com`.

### Filter pipeline (non-obvious)
[src/app/components/Dashboard.tsx](src/app/components/Dashboard.tsx) deliberately splits filtering between server and client:

1. Only `weather` is sent to the API (`getFashionByWeather`) — gender and temperature filters are **not** server-side.
2. The client computes a `TempBand` (`freezing`/`cold`/`cool`/`mild`/`warm`/`hot`) from the current temperature via `getTempBand()` at [Dashboard.tsx:191](src/app/components/Dashboard.tsx#L191). Band thresholds: `≤0 / ≤9 / ≤16 / ≤22 / ≤27 / >27`.
3. Each item's band is derived by `getItemTempBand()` from the first available of `temperature_avg_c`, `temperature_feels_like_c`, `temperature_max_c`, `temperature_min_c` — the stored `temperature_band` column is ignored. Items with **none** of these numeric values bypass the band check and render with a gray "기온 무관" badge.
4. Final filter: `(itemBand === null || itemBand === currentWeatherBand) && item.gender === selectedGender`.

If you change band thresholds, update both `getTempBand` and `tempBandConfig` (display labels/ranges) so they stay in sync.

### UI stack
- shadcn/ui components live in [src/app/components/ui/](src/app/components/ui/) (imported via the `cn()` helper in [ui/utils.ts](src/app/components/ui/utils.ts)).
- Tailwind v4 is wired through `@tailwindcss/vite` — **do not add `tailwindcss` or `autoprefixer` to `postcss.config.mjs`** (the file documents this explicitly). Styles are entered via [src/styles/index.css](src/styles/index.css) which imports `fonts.css`, `tailwind.css`, and `theme.css`.
- Radix UI, MUI, and shadcn are all present. New UI work should prefer the existing shadcn primitives in `components/ui/` over adding new Radix/MUI usage.

### Vite specifics
[vite.config.ts](vite.config.ts) has two non-default behaviors:
- A custom `figmaAssetResolver` plugin maps `figma:asset/<filename>` imports to `src/assets/<filename>`. The `figma:asset/*` module type is declared in [src/vite-env.d.ts](src/vite-env.d.ts).
- `assetsInclude` is `['**/*.svg', '**/*.csv']` for raw imports — the inline comment explicitly forbids adding `.css`, `.tsx`, or `.ts` here.
- Path alias `@` → `./src`.

The React + Tailwind plugin pair is required by Figma Make tooling even if Tailwind isn't actively used — don't remove either.

## Required sheet field values
When working with fashion items, these fields have constrained vocabularies (enforced by `FashionItem` type, the OpenAPI `enum`s, and used as filter keys):
- `weather`: `sunny | cloudy | rainy | snowy | windy | foggy`
- `gender`: `male | female | unisex`
- `fashion_category`: `casual | street | minimal | formal | sporty | business | date | travel`

`temperature_band` is **not** persisted server-side (the Apps Script strips it on input per [openapi.yaml](openapi.yaml) `FashionItemInput`); the client-side `TempBand` is derived from `temperature_*_c`. `active: false` items are excluded after fetch.
