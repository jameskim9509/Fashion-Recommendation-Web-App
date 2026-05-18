# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm i` — install dependencies (pnpm-workspace.yaml is also present; either works, repo declares itself as a single-package workspace).
- `npm run dev` — start the Vite dev server.
- `npm run build` — production build via `vite build`.

There is no lint, typecheck, or test script configured. If you need type checking, run `npx tsc --noEmit` (no `tsconfig.json` is committed, so flags must be passed explicitly).

## Architecture

This is a Figma Make export — a React 18 + Vite + TypeScript SPA for weather-based fashion recommendations. UI strings are Korean.

### Page routing
[src/app/App.tsx](src/app/App.tsx) uses a `useState` page switch between `Dashboard` and `AdminDashboard` — there is no router despite `react-router` being in dependencies. Navigation flows through `onNavigateToAdmin` / `onNavigateBack` props.

### Data layer (Google Apps Script + Sheets)
The "backend" is a Google Apps Script Web App backed by a Google Sheet, accessed through [src/app/services/fashionApi.ts](src/app/services/fashionApi.ts). `API_BASE_URL` and `API_TOKEN` are hard-coded at the top of that file — updating either means editing the constants. See [API_SETUP.md](API_SETUP.md) for Apps Script deployment, token generation (`setApiToken()`), and the JSON request shape for upsert/delete.

POST requests use `Content-Type: text/plain;charset=UTF-8` deliberately — this avoids CORS preflight against Apps Script. Don't "fix" it to `application/json`. All fetches use `redirect: "follow"` because Apps Script `/exec` endpoints redirect to `googleusercontent.com`.

### Filter pipeline (non-obvious)
[src/app/components/Dashboard.tsx](src/app/components/Dashboard.tsx) deliberately splits filtering between server and client:

1. Only `weather` is sent to the API (`getFashionByWeather`) — gender and temperature filters are **not** server-side.
2. The client computes a `TempBand` (`freezing`/`cold`/`cool`/`mild`/`warm`/`hot`) from the current temperature via `getTempBand()` at [Dashboard.tsx:191](src/app/components/Dashboard.tsx#L191). Band thresholds: `≤0 / ≤9 / ≤16 / ≤22 / ≤27 / >27`.
3. Each item's band is derived by `getItemTempBand()` from the first available of `temperature_avg_c`, `temperature_feels_like_c`, `temperature_max_c`, `temperature_min_c` — the stored `temperature_band` column is ignored. **An item with no numeric temperature is filtered out entirely.**
4. Final filter requires `itemBand === currentWeatherBand && item.gender === selectedGender`.

If you change band thresholds, update both `getTempBand` and `tempBandConfig` (display labels/ranges) so they stay in sync.

### UI stack
- shadcn/ui components live in [src/app/components/ui/](src/app/components/ui/) (imported via the `cn()` helper in [ui/utils.ts](src/app/components/ui/utils.ts)).
- Tailwind v4 is wired through `@tailwindcss/vite` — **do not add `tailwindcss` or `autoprefixer` to `postcss.config.mjs`** (the file documents this explicitly). Styles are entered via [src/styles/index.css](src/styles/index.css) which imports `fonts.css`, `tailwind.css`, and `theme.css`.
- Radix UI, MUI, and shadcn are all present. New UI work should prefer the existing shadcn primitives in `components/ui/` over adding new Radix/MUI usage.

### Vite specifics
[vite.config.ts](vite.config.ts) has two non-default behaviors:
- A custom `figmaAssetResolver` plugin maps `figma:asset/<filename>` imports to `src/assets/<filename>` (the `src/assets` directory may not yet exist; create it before adding such imports).
- `assetsInclude` is `['**/*.svg', '**/*.csv']` for raw imports — the inline comment explicitly forbids adding `.css`, `.tsx`, or `.ts` here.
- Path alias `@` → `./src`.

The React + Tailwind plugin pair is required by Figma Make tooling even if Tailwind isn't actively used — don't remove either.

## Required sheet field values
When working with fashion items, these fields have constrained vocabularies (enforced by `FashionItem` type and used as filter keys):
- `weather`: `sunny | cloudy | rainy | snowy | windy | foggy`
- `gender`: `male | female | unisex`
- `fashion_category`: `casual | street | minimal | formal | sporty | business | date | travel`
- `temperature_band` (stored but **unused by client filtering** — see above): `freezing | cold | cool | mild | warm | hot`

`active: false` items are excluded after fetch.
