# elemental-earth

An incremental/idle crafting game themed around chemical elements and alchemy. Vue 3 SPA, Chinese UI.

## Project

- **Stack:** Vue 3 (Composition API + `<script setup>`), TypeScript, Vite 8, Pinia, Vue Router 4, Tailwind CSS 4 + daisyUI 5, Iconify, crypto-js
- **Entry:** `src/main.ts` → `App.vue` → `DefaultLayout.vue` (Header + Left sidebar + Content + Right sidebar)
- **Path alias:** `@/` maps to `src/`
- **Config:** `reasonix.toml` at project root (Reasonix agent config)

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build (`vue-tsc -b && vite build`) |
| `npm run preview` | Preview the production build |
| `npm run type-check` | Type-check only (`vue-tsc --noEmit`) |

There are no tests.

## Architecture

```
src/
├── main.ts                     # App bootstrap (Pinia, router, Iconify global)
├── App.vue                     # Root component (<RouterView />)
├── style.css                   # Tailwind + daisyUI entry (@import "tailwindcss"; @plugin "daisyui")
├── router/index.ts             # Routes: /home, /tech, /lab, /explore, /settings
├── layouts/
│   ├── DefaultLayout.vue       # Three-column shell (Header / Left / Content / Right)
│   └── components/             # Layout sub-components (Header, Left, Right, Content, Menu)
├── views/                      # Page components (LabView.vue is the largest at ~26KB)
├── components/                 # Shared UI components (Action, ActionTip, Item, PeriodicTable, Task, Tech)
├── stores/
│   ├── index.ts                # Pinia setup
│   └── modules/                # Store modules: app, log, pack, state, task
├── data/                       # Game data (static typed arrays/objects)
│   ├── elements.ts             # Periodic table data (118 elements + categories)
│   ├── actions.ts              # Craft/gathering actions with rewards
│   ├── items.ts                # Item definitions
│   ├── formula.ts              # Crafting formulas
│   ├── labs.ts                 # Lab operations
│   ├── maps.ts                 # Map/area definitions
│   └── techs.ts                # Tech tree definitions
├── utils/
│   ├── archive.ts              # Auto-save logic
│   ├── date.ts                 # Time formatting (shortTime)
│   ├── function.ts             # Utility helpers (noop, clone, sleep, once, waitUntil, box)
│   └── storage.ts              # Encrypted localStorage via crypto-js (AES)
└── assets/                     # Static images (hero.png, vite.svg, vue.svg)
```

## Conventions

- **SFC style:** Always `<script setup lang="ts">` with Composition API. No Options API.
- **Pinia stores:** Setup-function syntax (`defineStore('name', () => { ... })`) with explicit return of public members.
- **Imports:** Use `@/` alias for project files (e.g. `import { usePackStore } from '@/stores/modules/pack'`).
- **Typing:** Every function/method has explicit TypeScript return types. Interfaces are exported and JSDoc-annotated (Chinese comments).
- **Data files:** Game content lives in `src/data/` as typed exported interfaces + corresponding const arrays. Comments in Chinese.
- **State:** `src/stores/modules/` stores are the single source of truth for game state — components read from stores, never from data files directly.
- **UI:** Tailwind CSS utility classes + daisyUI `btn`/`card`/`modal` components. Data-theme via `appStore.theme`.
- **Storage:** Encrypted via `crypto-js` AES through `src/utils/storage.ts`. Plain `localStorage` should not be used directly.
- **Semicolons:** Used (semicolons style).
- **No tests exist** — no testing framework in dependencies.

## Notes

<!-- Quick-add space for future agent findings -->
