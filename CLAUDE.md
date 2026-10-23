# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

**Scout** (repo `fieldmapper-kids`): a PWA for children aged 5–10 to explore outdoors, save finds on a map, collect
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
| `App.ts` | The orchestrator: owns settings, profiles (and the active one), every find and hunt run (scoped to the active explorer on screen), the map, the chrome and the guide dock. |
| `types.ts` | `Find` (with `pictures[]`, `species`, `sign`, `placeBy`), `Profile`, `Settings` (device-wide), `GuideId`. |
| `findModel.ts` | `normalizeFind`: reads a version-1 find (one `photo` / one `drawing`) into the `pictures` list. Every read goes through it. |
| `storage.ts` | IndexedDB (`FieldMapperKids` — the pre-rename name, kept so nobody's finds are orphaned), `DB_VERSION` 3: `finds`, `settings`, `trails`, `huntRuns`, `customHunts`, `profiles`, `speciesLists`, `walks`. `migrateToProfiles` turns a version-1 device's single explorer (in the settings) into the first profile and files every find and hunt run under it. |
| `profiles.ts` | Explorer profiles: "Who's exploring?", the profile card editor (name, about, photo or emoji, mode, guide, guide's name). Adding an explorer, switching TO Together mode and deleting ask for a grown-up; back to Explorer mode does not. The mode switches any time from the 🧒/👨‍👧 button on the map (`App.toggleMode`) or "Who's exploring?". |
| `guides.ts` | Any of the eight characters as an explorer's guide, and the name they are called (`guideName`, renamable). `buddyView.setGuideName` makes every bubble use it. |
| `species.ts`, `speciesStore.ts`, `familiar.ts` | Naming a find: the slim species record, search by the find's kind (`CATEGORY_TAXA`), readers for Field Mapper species files and CSVs; the loaded list (built-in + imported); the big-button familiar species (each name must exist in the list — tested). |
| `mapPicker.ts`, `basemapPicker.ts` | "Tap the map" placement (a fixed target over the map centre) and the Streets / Satellite / Hybrid chooser. |
| `mapView.ts` | MapLibre map, OpenFreeMap style with an offline fallback, HTML markers, walk trail. |
| `capture.ts` | The "I found something!" flow, one step per screen: pictures (any number of photos and drawings) · kind · clue (tracks & scat) · species · colours · size · count · where (GPS with accuracy words, tap the map, or nowhere) · tell. Passing an existing find EDITS it: it opens on a summary (`overview`) with one row per answer; a row opens just that question and returns to the summary (a change of kind also asks the clue / species questions that depend on it), and Save is on the summary. Same id, time and, unless changed, place. |
| `screens.ts` | Celebration, sticker book, find detail (all pictures, Change it), badges, challenges, the crew. An open book redraws on `FINDS_CHANGED`. |
| `huntScreens.ts` | Scavenger hunts: pick, progress, trophy shelf, hunt maker. |
| `grownUps.ts`, `gateView.ts` | Grown-up corner and the hold-then-sum gate. |
| `welcome.ts` | First launch: mode, then the first explorer's card (`profiles.welcomeForm`). |
| `buddies.ts` | Pip and Hop drawn as SVG — **copied from GPS2026felt `src/tour/avatars.ts`**; keep the art in step. |
| `buddyView.ts`, `buddyLines.ts` | The buddy and the crew on screen (`buddySays` / `crewSays`), and what each buddy says. |
| `critters.ts`, `cast.ts` | The woodland crew, drawn in Pip and Hop's style, and who looks after what: Fern the fox (hunts), Maple the moose (badges), Bramble the bear (safety: tick check, grown-up gate), Hoot the owl (facts), Acorn the squirrel (sticker book), Bandit the raccoon (challenges). A new part of the app gets a crew member, not a new character. |
| `tickGuide.ts`, `tickScreen.ts` | The end-of-adventure tick check and the grown-ups' how-to (CDC / Health Canada advice; general information, not medical advice). |
| `look.ts`, `lookApply.ts`, `lookScreen.ts` | "My look", per explorer (`Profile.look`, absence = default): colour theme (Forest · Ocean · Sunset · Berry · Night · Snow), button style (Bubbly · Sticker · Flat · Blocky), text size, font, motion. Each is one `data-` attribute on `<html>` whose CSS (the LOOKS block at the foot of `styles.css`) only re-points tokens; a new choice needs a CSS block (tested). Kids change it themselves — no gate. |
| `walk.ts`, `recorder.ts`, `walkScreens.ts` | "Record my path": streamed GPS fixes kept only where they are movement (`judgePoint`: ≤ 35 m accuracy, ≥ 5 m step, no faster than 12 m/s), saved every few seconds as the path grows, optional screen wake lock; a path left recording when the app closed ends at its last point (`closeOrphan`). Saved paths draw purple, the live one orange. Distinct from the automatic daily trail (`trail.ts`). |
| `speech.ts`, `voiceRank.ts` | Reading aloud with the device's own voices (never a network voice service): `pickVoice` chooses the best-sounding installed English voice (natural / neural / enhanced, Canadian first, never novelty voices) unless a grown-up chose one in the Grown-up corner. The 🔊/🔇 button on the map switches reading aloud. |
| `voice.ts`, `drawPad.ts`, `image.ts`, `speech.ts`, `sound.ts`, `confetti.ts`, `gps.ts`, `trail.ts`, `exportData.ts` | One job each. |

**Pure, DOM-free and unit-tested:** `badges.ts`, `challenges.ts`, `hunts.ts`, `gate.ts`, `csv.ts`,
`geo.ts`, `categories.ts`, `buddies.ts`, `buddyLines.ts`, `critters.ts`, `cast.ts`, `tickGuide.ts`, `guides.ts`,
`findModel.ts`, `species.ts`, `familiar.ts`, `ids.ts`, `walk.ts`, `voiceRank.ts`, `look.ts`. Keep logic there and the DOM out of them.

## Species lists

`public/species/ns.json` is GENERATED from Fraxinus Field Mapper's ACCDC lists by
`node scripts/import-fieldmapper-species.mjs --from ../GPS2026felt [--region ns|nb|pe|nl|lb]` — re-run it, never
hand-edit. It keeps named species, drops accidental / doubtful / unconfirmed / false-report / absent / hybrid records
and unranked (SU) invertebrates, and folds subspecies by common name. It is precached so naming works offline. A
grown-up can also import any Field Mapper `db-*.json` file or a CSV (Grown-up corner ▸ Species lists).

## Rules

- **Child safety and privacy first.** No accounts, no uploads, no analytics, no third-party requests
  beyond the map tiles. Anything destructive or outward (delete, export, settings) sits behind the
  grown-up gate in Explorer mode. Exact coordinates are shown only in Together mode.
- **Colours, borders and corners are tokens** (`--bg`, `--card`, `--ink`, `--green` (the accent), `--good-soft`…, `--bw`,
  `--radius`): never hard-code a colour in a new rule, or a theme (Night above all) will miss it.
- **Age tiers are planned, not built**: read `docs/AGE_TIERS.md` before adding anything age-specific.
- **All text goes through `textContent`** (`ui.ts` `h()`); the only `innerHTML` is the buddy SVG,
  which is our own constant markup.
- **Words are short and are read aloud** (`say()`); every button has an emoji and a word.
- **Blank is not zero**: a find with no location is simply not on the map; nothing is invented.
- **A hunt is stored BY VALUE on its run**, so editing a custom hunt never changes a hunt already
  under way or won. A deleted find re-opens the hunt item it ticked.
- **Badges and challenges are derived** from the finds (and finished-hunt and tick-check counts); nothing is stored for them.
- **Finds, hunt runs, recorded paths and tick checks belong to a profile**; custom hunts, species lists and device settings are shared.
- **A place is only what was chosen**: GPS (accuracy kept), a tapped spot (`placeBy: 'map'`, no accuracy), or none.
- **Every save writes fresh copies of its blobs** (`storage.detach`): Safari can return a Blob read from IndexedDB that
  still points at the stored record's file, and writing it into a new version of the same record can lose it — which is
  how an edit lost a drawing. Never `put` a blob you read back without going through `saveFind` / `saveProfile`.
- **Never style a MapLibre marker's own element with `position` or `transform`**: MapLibre positions it (absolute plus an
  inline transform). A `position: relative` there put every pin in normal flow, so pins drifted as the map zoomed. Draw
  inside an inner element (`.find-pin`, `.me-inner`).
- **Changing the IndexedDB schema** needs a `DB_VERSION` bump and an upgrade path in `storage.ts`.
- **Tile caching**: OpenFreeMap tiles/glyphs/sprites and Esri imagery tiles are `CacheFirst`; the style and TileJSON are
  `NetworkFirst` because they name the current data release. Keep it that way. Imagery is capped at z18 and overzoomed.
