# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

**Field Mapper Kids**: a PWA for children aged 5–10 to explore outdoors, save finds on a map, collect
badges and go on scavenger hunts with a buddy (Pip the rat or Hop the frog). It is a separate,
much smaller app from Fraxinus Field Mapper (`fraxinusenviro/GPS2026felt`), sharing its stack and
its two characters, and nothing else. Do not add code here that talks to Field Mapper's backend.

Stack: vanilla TypeScript + Vite + MapLibre GL 5 + `idb` + `vite-plugin-pwa`. **No UI framework.**

## Commands

```bash
npm install
npm run dev
npm test          # node --test test/*.test.ts (Node 22 type stripping; imports need .ts extensions)
npm run build     # tsc (noEmit, strict) && vite build
```

There is no linter; `tsc` is the gate.

## Layout (`src/`)

| File | Role |
|---|---|
| `main.ts` | Registers the service worker (update applies only at launch) and starts `App`. |
| `App.ts` | The orchestrator: owns settings, finds, hunt runs, the map, the top/bottom chrome and the buddy dock. |
| `types.ts` | `Find`, `Settings`, `Mode`. |
| `storage.ts` | IndexedDB (`FieldMapperKids`): `finds`, `settings`, `trails`, `huntRuns`, `customHunts`. |
| `mapView.ts` | MapLibre map, OpenFreeMap style with an offline fallback, HTML markers, walk trail. |
| `capture.ts` | The "I found something!" flow, one step per screen. |
| `screens.ts` | Celebration, sticker book, find detail, badges, challenges. |
| `huntScreens.ts` | Scavenger hunts: pick, progress, trophy shelf, hunt maker. |
| `grownUps.ts`, `gateView.ts` | Grown-up corner and the hold-then-sum gate. |
| `welcome.ts` | First launch: mode, name, map picture, buddy. |
| `buddies.ts` | Pip and Hop drawn as SVG — **copied from GPS2026felt `src/tour/avatars.ts`**; keep the art in step. |
| `buddyView.ts`, `buddyLines.ts` | The buddy on screen, and what each buddy says. |
| `voice.ts`, `drawPad.ts`, `image.ts`, `speech.ts`, `sound.ts`, `confetti.ts`, `gps.ts`, `trail.ts`, `exportData.ts` | One job each. |

**Pure, DOM-free and unit-tested:** `badges.ts`, `challenges.ts`, `hunts.ts`, `gate.ts`, `csv.ts`,
`geo.ts`, `categories.ts`, `buddies.ts`, `buddyLines.ts`. Keep logic there and the DOM out of them.

## Rules

- **Child safety and privacy first.** No accounts, no uploads, no analytics, no third-party requests
  beyond the map tiles. Anything destructive or outward (delete, export, settings) sits behind the
  grown-up gate in Explorer mode. Exact coordinates are shown only in Together mode.
- **All text goes through `textContent`** (`ui.ts` `h()`); the only `innerHTML` is the buddy SVG,
  which is our own constant markup.
- **Words are short and are read aloud** (`say()`); every button has an emoji and a word.
- **Blank is not zero**: a find with no location is simply not on the map; nothing is invented.
- **A hunt is stored BY VALUE on its run**, so editing a custom hunt never changes a hunt already
  under way or won. A deleted find re-opens the hunt item it ticked.
- **Badges and challenges are derived** from the finds (and finished-hunt count); nothing is stored for them.
- **Changing the IndexedDB schema** needs a `DB_VERSION` bump and an upgrade path in `storage.ts`.
- **Tile caching**: OpenFreeMap tiles/glyphs/sprites are `CacheFirst`; the style and TileJSON are
  `NetworkFirst` because they name the current data release. Keep it that way.
