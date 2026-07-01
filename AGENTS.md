# elemental-earth

An incremental/idle crafting game themed around chemical elements and alchemy. Vue 3 SPA, Chinese UI.

## Project

- **Stack:** Vue 3 (Composition API + `<script setup>`), TypeScript, Vite 8, Pinia, Vue Router 4, Tailwind CSS 4 + daisyUI 5, Iconify, crypto-js, vite-plugin-svg-icons
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
├── main.ts                     # App bootstrap (Pinia, router, Iconify global, svg-icons register)
├── App.vue                     # Root — mounts ElementDiscovery + DiscoveryDialog + EraTransition
├── style.css                   # Tailwind + daisyUI entry
├── vite-env.d.ts               # vite-plugin-svg-icons client type declarations
├── router/index.ts             # Routes: /home, /tech, /lab, /explore, /settings, /admin
├── layouts/
│   ├── DefaultLayout.vue       # Three-column shell (Header / Left / Content / Right)
│   ├── AdminLayout.vue         # Independent layout for admin panel (no sidebars)
│   └── components/
│       ├── Header.vue          # Top bar: map switcher, save, settings
│       └── Left.vue            # Sidebar: item inventory with categories
├── views/
│   ├── HomeView.vue            # Main page — action buttons + proven formulas
│   ├── TechView.vue            # Tech tree — research techs
│   ├── LabView.vue             # Lab — experiment with operations, chains, fuel
│   ├── ExploreView.vue         # Periodic table
│   ├── SettingsView.vue        # Settings + import/export save + notifications
│   └── admin/                  # Admin panel (Vue-based, replaces old server/public/)
│       ├── AdminLogin.vue      # Password login
│       ├── AdminDashboard.vue  # Navigation grid (includes eras link)
│       ├── AiGenerator.vue     # AI content generation with checkboxes + edit
│       ├── ResultSection.vue   # AI result cards with checkbox selection
│       └── types/
│           ├── MapsView.vue    # Map editor with graphical coordinate editor + zoom
│           ├── ItemsView.vue   # Item editor with discovery toggle + milestone select
│           ├── ActionsView.vue # Action editor with alternative materials + reward maps + cooldown
│           ├── TechsView.vue   # Tech editor with milestone select
│           ├── LabsView.vue    # Lab operation editor with milestone select
│           ├── FormulasView.vue# Formula editor with chain operations + required_item on products
│           ├── ElementsView.vue# Element editor (read-only)
│           └── ErasView.vue    # Era config viewer
├── components/
│   ├── Action.vue              # Action button with batch count + material alternatives + cooldown
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
│   ├── EraTransition.vue       # Era advancement animation overlay
│   ├── DataEditorModal.vue     # Generic data editor (maps/items/actions/techs/labs/formulas)
│   ├── SearchableSelect.vue    # Searchable dropdown with Teleport (avoids overflow clipping)
│   └── SvgIcon.vue             # SVG sprite icon component (vite-plugin-svg-icons)
├── stores/
│   ├── index.ts                # Pinia setup
│   └── modules/
│       ├── app.ts              # App theme/config (taskNotifyMode, desktopPush, notifyOnlyHidden)
│       ├── log.ts              # Game log (types: process, reward, tech, lab, elements)
│       ├── pack.ts             # Inventory (items, techs, formulas, itemRenames, discoveredItems, cooldowns)
│       ├── state.ts            # Game state (map, elements, pendingDiscovery, era system)
│       └── task.ts             # Task queue with reward/cycle logic + guaranteed rewards + cooldown
├── data/
│   ├── elements.ts             # Periodic table data (118 elements)
│   ├── actions.ts              # Actions with IReward (guaranteed, map, required_item, cooldown)
│   ├── items.ts                # Item definitions (is_discovery, milestone)
│   ├── formula.ts              # Formulas (products with required_chain_operation, required_item)
│   ├── labs.ts                 # Lab operations (is_chain, milestone)
│   ├── maps.ts                 # Map definitions
│   ├── techs.ts                # Tech tree (milestone)
│   └── eras.ts                 # Era definitions with milestones
├── utils/
│   ├── archive.ts              # Auto-save (encrypted), load/save (renames, discovered, cooldowns, era)
│   ├── date.ts                 # Time formatting
│   ├── function.ts             # Utility helpers
│   ├── storage.ts              # Encrypted localStorage via crypto-js AES
│   └── notification.ts         # Desktop notification (each task / all tasks done, only when hidden)
└── assets/
    ├── icons/                  # SVG icons for vite-plugin-svg-icons
    └── ...

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
- **Alternative materials**: `required_items[].key` supports `string | string[]`. Actions with multiple alternatives show a ⚙ selector when multiple options are available.
- **Material-dependent rewards**: Rewards can specify `required_item` (string or string[]) — the reward only appears when a specific material was consumed.
- **Guaranteed rewards**: Rewards with `guaranteed: true` always drop alongside the random reward selection.
- **Cooldown**: Actions can have a `cooldown` (seconds). After the task completes, the action enters cooldown. Button shows a countdown overlay. Cooldown state persisted in encrypted save data.
- **Map-specific rewards**: Rewards can have `map` entries with per-map probability overrides.

### Lab (Experiments)
- **Operations**: Select container → materials → operation → chain operations → fuel/fire → execute.
- **Chain operations**: Multiple chain operations can be appended simultaneously. Products with `required_chain_operation` only appear when the matching chain op is selected.
- **Formula system**: Matches formulas by operation + container + materials. Unproven formulas show "未知结果". Proven formulas display exact products. Products can have `required_item` (only appears when specific reactant consumed).
- **Cycle limits**: Unproven formulas only limited by fuel/fire. Proven formulas also respect container durability and formula max constraints.
- **Container auto-selection**: When multiple instances of same container exist, the one with highest durability is used for display. Consumption happens from first instance.

### Items
- **Discovery system**: Items with `is_discovery: true` trigger a naming dialog on first acquisition. Player can set custom name + note.
- **Custom names**: All item displays use `getDisplayName()`. Item descriptions shown via teleported tooltips.
- **Gas handling**: Gas-type items can only be collected with appropriate chain operation (`gas_collecting` for insoluble, `gas_collecting_air` for soluble).

### Era System
- **6 eras**: Stone (0) → Alchemy (1) → Modern Chemistry (2) → Electrochemistry (3) → Rare Earth (4) → Atomic Age (5)
- **Milestones**: Configured directly on items (`item.milestone`), techs (`tech.milestone`), and lab operations (`lab.milestone`). Obtaining the item/researching the tech/completing a lab operation that matches a milestone triggers the advancement.
- **Era advancement**: When all milestones of the current era are completed, the game advances to the next era with a full-screen transition animation.
- **Admin**: `/admin/eras` to view all eras and their milestones.

### Electricity System
- **Durable consumption**: Items with `durable` properties (e.g., `battery`, `lead_acid_battery`) act as power sources.
- **Formula Requirement**: Formulas can specify `requires_electricity: true`. If checked, the system searches inventory for a `durable` item with `type: ['tool']` and `battery` in its key to use as a power source.
- **Depletion**: Power sources lose durability instead of quantity. When durability reaches 0, the item stack is reduced by 1.

### Inventory Management
- **Discarding**: Durable items with reduced durability can be explicitly discarded by the user via a trash icon (calls `packStore.discardItem`).
- **Renaming**: Items with `is_discovery: true` trigger a naming dialog. All items support custom notes and nicknames via `RenameDialog`.

### Elements
- **Discovery animation**: Full-screen animation: title → pause → 3D card flip → fly to periodic table → light up.
- **Elemental field**: Only on pure elements, not minerals/ores.

### Tech Tree
- **Visibility**: Techs visible when prereqs are researched. Undiscovered materials show as `????`.

### Notifications
- **Desktop push**: System notifications via Notification API. Configurable: each task / all tasks done.
- **Only when hidden**: Option to only notify when the browser tab is not active.

### Admin Panel
- **Route**: `/admin` with password login.
- **Auth**: HMAC-based token in localStorage.
- **SearchableSelect**: All item/tech/map dropdowns are searchable (Teleported to body to avoid modal clipping).
- **Map coordinates**: Graphical editor with drag-and-drop + zoom.
- **AI Generator**: OpenAI generation with per-item checkboxes, edit buttons (DataEditorModal), save/create-or-update logic.
- **Import/Export**: AES-encrypted + base64 encoded save export/import via modal dialog.

### AI Generator (server/ai-generator.ts)
- **Prompt**: Full system prompt with all data model schemas, generation rules, and conventions.
- **Output**: `{ items, actions, techs, labs, formulas, modifications }`.
- **Rules**: Ores → add to blasting + directional_blasting. Techs only unlock tool actions. New materials via formulas only.

## Conventions

- **SFC style:** Always `<script setup lang="ts">` with Composition API. No Options API.
- **Pinia stores:** Setup-function syntax (`defineStore('name', () => { ... })`) with explicit return of public members.
- **Imports:** Use `@/` alias for project files.
- **Typing:** Explicit TypeScript return types. Interfaces exported with JSDoc (Chinese).
- **State:** Pinia stores are single source of truth. Components read from stores, never from data files.
- **UI:** Tailwind CSS + daisyUI. Data-theme via `appStore.theme`.
- **Storage:** Encrypted via `crypto-js` AES. Plain localStorage used only for batch count (non-critical).
- **No tests** — no testing framework.

## Notes

<!-- Quick-add space for future agent findings -->
