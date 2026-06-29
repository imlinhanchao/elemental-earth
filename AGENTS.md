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
| `npm run dev` | Start Vite dev server (port 5173, proxies `/api` to backend 3001) |
| `npm run build` | Type-check + production build (`vue-tsc -b && vite build`) |
| `npm run preview` | Preview the production build |
| `npm run type-check` | Type-check only (`vue-tsc --noEmit`) |
| `cd server && npm start` | Start backend admin API server (port 3001, `node --env-file .env --import tsx/esm index.ts`) |
| `pm2 restart ele-admin` | Restart backend via PM2 |

The build may fail due to rolldown native binding (`@rolldown/binding-linux-x64-gnu`) — use `npm run dev` for development.

## Architecture

```
src/
├── main.ts                     # App bootstrap (Pinia, router, Iconify global)
├── App.vue                     # Root — mounts ElementDiscovery + DiscoveryDialog
├── style.css                   # Tailwind + daisyUI entry
├── router/index.ts             # Routes: /home, /tech, /lab, /explore, /settings, /admin
├── layouts/
│   ├── DefaultLayout.vue       # Three-column shell (Header / Left / Content / Right)
│   ├── AdminLayout.vue         # Independent layout for admin panel (no sidebars)
│   └── components/             # Layout sub-components
│       ├── Header.vue          # Top bar: map switcher, save, settings
│       └── Left.vue            # Sidebar: item inventory with categories
├── views/
│   ├── HomeView.vue            # Main page — action buttons + proven formulas
│   ├── TechView.vue            # Tech tree — research techs
│   ├── LabView.vue             # Lab — experiment with operations, chains, fuel
│   ├── ExploreView.vue         # Periodic table
│   ├── SettingsView.vue        # Settings + reset save
│   └── admin/                  # Admin panel (Vue-based, replaces old server/public/)
│       ├── AdminLogin.vue      # Password login
│       ├── AdminDashboard.vue  # Navigation grid
│       ├── AiGenerator.vue     # AI content generation with checkboxes + edit
│       ├── ResultSection.vue   # AI result cards with checkbox selection
│       └── types/              # Per-type CRUD management pages
│           ├── MapsView.vue    # Map editor with graphical coordinate editor
│           ├── ItemsView.vue   # Item editor with discovery toggle
│           ├── ActionsView.vue # Action editor with alternative materials + reward maps
│           ├── TechsView.vue   # Tech editor
│           ├── LabsView.vue    # Lab operation editor
│           ├── FormulasView.vue# Formula editor with chain operations
│           └── ElementsView.vue# Element editor (read-only)
├── components/                 # Shared UI components
│   ├── Action.vue              # Action button with batch count + material alternatives
│   ├── ActionTip.vue           # Hover tooltip for action requirements (shows ???? for unknown)
│   ├── Item.vue                # Inventory item (custom name, teleported tooltip)
│   ├── InlineTooltip.vue       # Fixed-position tooltip (via Teleport, bypasses overflow)
│   ├── PeriodicTable.vue       # Element periodic table
│   ├── Task.vue                # Task queue item
│   ├── Tech.vue                # Tech button
│   ├── ElementDiscovery.vue    # Element discovery animation overlay
│   ├── DiscoveryDialog.vue     # Discovery naming dialog (name + note)
│   ├── RenameDialog.vue        # Rename/note editor for any item
│   ├── FormulaDialog.vue       # Formula execution dialog (materials, chain ops, fuel)
│   └── DataEditorModal.vue     # Generic data editor (maps/items/actions/techs/labs/formulas)
├── stores/
│   ├── index.ts                # Pinia setup
│   └── modules/
│       ├── app.ts              # App theme/config
│       ├── log.ts              # Game log (types: process, reward, tech, lab, elements)
│       ├── pack.ts             # Inventory (items, techs, formulas, itemRenames, discoveredItems)
│       ├── state.ts            # Game state (map, elements, pendingDiscovery)
│       └── task.ts             # Task queue with reward/cycle logic
├── data/                       # Game data (static typed arrays/objects)
│   ├── elements.ts             # Periodic table data (118 elements)
│   ├── actions.ts              # Actions with IReward (optional map, required_item)
│   ├── items.ts                # Item definitions (is_discovery flag)
│   ├── formula.ts              # Formulas (products with required_chain_operation)
│   ├── labs.ts                 # Lab operations (is_chain, chain_operations)
│   ├── maps.ts                 # Map definitions
│   └── techs.ts                # Tech tree
├── utils/
│   ├── archive.ts              # Auto-save (encrypted), load/save (includes renames + discovered)
│   ├── date.ts                 # Time formatting
│   ├── function.ts             # Utility helpers
│   └── storage.ts              # Encrypted localStorage via crypto-js AES
└── assets/

server/                          # Express backend (TypeScript, tsx runner)
├── index.ts                     # API: CRUD + admin login + requireAdmin middleware
├── ai-generator.ts              # OpenAI integration with game data generation prompt
├── tsconfig.json                # TypeScript config
├── package.json                 # express, openai, tsx, typescript
├── .env.example                 # OPENAI_API_KEY, ADMIN_PASSWORD, PORT
└── public/                      # Static files (legacy admin HTML still served)
```

## Key Gameplay Features

### Actions
- **Batch execution**: Each action button has a batch count selector (top-left), persisted in localStorage per action key. Up to 20x or remaining task slots.
- **Alternative materials**: `required_items[].key` supports `string | string[]`. Actions with multiple alternatives show a ⚙ selector (top-right) when multiple options are available.
- **Material-dependent rewards**: Rewards can specify `required_item` (string or string[]) — the reward only appears when a specific material was consumed.
- **Map-specific rewards**: Rewards can have `map` entries with per-map probability overrides.

### Lab (Experiments)
- **Operations**: Select container → materials → operation → chain operations → fuel/fire → execute.
- **Chain operations**: Multiple chain operations can be appended (e.g., condensing + gas collection). Products with `required_chain_operation` only appear when the matching chain op is selected.
- **Formula system**: Matches formulas by operation + container + materials. Unproven formulas show "未知结果". Proven formulas display exact products.
- **Cycle limits**: Unproven formulas only limited by fuel/fire. Proven formulas also respect container durability and formula max constraints.
- **Container auto-selection**: When multiple instances of the same container exist, the one with highest durability is used for display/checking. Consumption happens from the first instance (worn-out items get used up first).

### Items
- **Discovery system**: Items with `is_discovery: true` trigger a naming dialog on first acquisition. Player can set custom name + note.
- **Custom names**: All item displays use `getDisplayName()` which returns custom name if set. Item descriptions shown via teleported tooltips (InlineTooltip, bypasses overflow clipping).
- **Gas handling**: Gas-type items can only be collected when "gas_collecting" chain operation is selected. Consuming gas returns a gas_bottle.

### Elements
- **Discovery animation**: When a new element is unlocked, a full-screen animation plays: title → pause (click to reveal) → 3D card flip → fly to periodic table → light up.
- **Element data**: Only pure elements get `elemental` field. Minerals/ores do not.

### Tech Tree
- **Visibility**: Techs only visible when prerequisite techs are researched. Materials never obtained show as `????` in requirements tooltip.
- **Tech descriptions**: Describe what technique is mastered, not what items are made from what materials.

### Admin Panel
- **Route**: `/admin` with password login (`ADMIN_PASSWORD` env var).
- **Auth**: HMAC-based token, stored in localStorage.
- **Data management**: CRUD for all data types, each with independent view component.
- **Map coordinates**: Graphical editor with drag-and-drop + zoom (30%-300%).
- **AI Generator**: OpenAI-powered generation of game data. Results show checkboxes (select which to save), edit buttons (open DataEditorModal), and modification suggestions.
- **Reward maps**: Per-map probability overrides with graphical tag editor.
- **Alternative material editors**: Tag-based multi-key input for alternative materials/items.

### AI Generator (server/ai-generator.ts)
- **Prompt**: System prompt describes all data models with JSON schemas, generation rules, and recent conventions.
- **Output**: `{ items, actions, techs, labs, formulas, modifications }` — modifications support `add_reward` and `update` operations on existing records.
- **Rules**: Techs only unlock tool-making actions. New materials via formulas only. Elemental field only on pure elements. Materials/gases use appearance descriptions; tools/containers use functional descriptions.

## Conventions

- **SFC style:** Always `<script setup lang="ts">` with Composition API. No Options API.
- **Pinia stores:** Setup-function syntax (`defineStore('name', () => { ... })`) with explicit return of public members.
- **Imports:** Use `@/` alias for project files (e.g. `import { usePackStore } from '@/stores/modules/pack'`).
- **Typing:** Every function/method has explicit TypeScript return types. Interfaces are exported and JSDoc-annotated (Chinese comments).
- **Data files:** Game content lives in `src/data/` as typed exported interfaces + corresponding const arrays. Comments in Chinese.
- **State:** `src/stores/modules/` stores are the single source of truth for game state — components read from stores, never from data files directly.
- **UI:** Tailwind CSS utility classes + daisyUI `btn`/`card`/`modal` components. Data-theme via `appStore.theme`.
- **Storage:** Encrypted via `crypto-js` AES through `src/utils/storage.ts`. Plain `localStorage` should not be used directly (except batch count in Action.vue which is non-critical).
- **Semicolons:** Used (semicolons style).
- **No tests exist** — no testing framework in dependencies.

## Notes

<!-- Quick-add space for future agent findings -->
