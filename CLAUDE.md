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
| `App.ts` | The orchestrator: owns settings, profiles (and the active one), every find and hunt run (scoped to the active explorer on screen), the map, the chrome and the guide dock. The right-hand map buttons fold behind one caret (`sideRail`, Field Mapper's `#btn-collapse-right`; device-local `scout.rail.collapsed`). The bottom bar's height and bottom padding are the `--bar-h` / `--bar-pad-b` tokens, which the buddy, the notes and the map credits sit above — change them there, not per element. |
| `types.ts` | `Find` (with `pictures[]`, `species`, `sign`, `placeBy`), `Profile`, `Settings` (device-wide), `GuideId`. |
| `findModel.ts` | `normalizeFind`: reads a version-1 find (one `photo` / one `drawing`) into the `pictures` list. Every read goes through it. |
| `storage.ts` | IndexedDB (`FieldMapperKids` — the pre-rename name, kept so nobody's finds are orphaned), `DB_VERSION` 3: `finds`, `settings`, `trails`, `huntRuns`, `customHunts`, `profiles`, `speciesLists`, `walks`. `migrateToProfiles` turns a version-1 device's single explorer (in the settings) into the first profile and files every find and hunt run under it. |
| `profiles.ts` | Explorer profiles: "Who's exploring?", the profile card editor (name, about, photo or emoji, mode, guide, guide's name). Adding an explorer, switching TO Together mode and deleting ask for a grown-up; back to Explorer mode does not. The mode switches any time from the 🧒/👨‍👧 button on the map (`App.toggleMode`) or "Who's exploring?". |
| `guides.ts`, `scoutArt.ts` | Any of the eight characters as an explorer's guide, and the name they are called (`guideName`, renamable). `buddyView.setGuideName` makes every bubble use it. A ninth, `scout` (**Scout the Survey Squirrel**, from the storybook), is never picked or stored: while the Field Journal look is on, `activeGuide(g)` returns him for the explorer's own guide — figure, name and lines (`buddyLines` has his own greetings, tips and cheers); the crew keep their jobs, and the profile's pick comes back with any other look. `lookApply` sets it and fires `look-changed`, which the map dock listens for. His figure is painted oval portraits (`assets/journal/scout-<pose>.webp`, one per `Expression`) set by `scoutArt.scoutHtml`, never an SVG. |
| `sproutArt.ts` | Picture drawings of species, in the crew's sticker style (decision 5 of `docs/AGE_TIERS.md`: drawings, never photos). Each names the list species it stands for and a "how to tell it" line (tested against `ns.json` and `FAMILIAR`). Shown as picture buttons first in the species step, on the find page, and as the find's picture when it has no photo or drawing. First drawings: Red Maple and Sugar Maple. |
| `species.ts`, `speciesStore.ts`, `familiar.ts` | Naming a find: the slim species record, search by the find's kind (`CATEGORY_TAXA`), readers for Field Mapper species files and CSVs; the loaded list (built-in + imported); the big-button familiar species (each name must exist in the list — tested). |
| `mapPicker.ts`, `basemapPicker.ts` | "Tap the map" placement (a fixed target over the map centre) and the Streets / Satellite / Hybrid chooser. |
| `mapView.ts` | MapLibre map, OpenFreeMap style with an offline fallback, HTML markers, walk trail. **Press and hold** (550 ms, abandoned on movement or a second finger, never on a pin; or a right-click) → `onLongPress`, ported from Field Mapper's `bindLongPress`, with a ring filling under the finger; App starts a find already placed there (`startCapture(..., at)` → `placeBy: 'map'`, changeable on the Where step). |
| `capture.ts` | The "I found something!" flow, one step per screen: pictures (any number of photos and drawings) · kind · clue (tracks & scat) · species · colours · size · count · where (GPS with accuracy words, tap the map, or nowhere) · tell. Passing an existing find EDITS it: it opens on a summary (`overview`) with one row per answer; a row opens just that question and returns to the summary (a change of kind also asks the clue / species questions that depend on it), and Save is on the summary. Same id, time and, unless changed, place. |
| `screens.ts` | Celebration, sticker book, find detail (all pictures, Change it), badges, challenges, the crew. An open book redraws on `FINDS_CHANGED`. |
| `huntScreens.ts` | Scavenger hunts: pick, progress, trophy shelf, hunt maker. |
| `grownUps.ts`, `gateView.ts` | Grown-up corner and the hold-then-sum gate. |
| `welcome.ts` | First launch: age tier (sets the starting mode and look), mode, then the first explorer's card (`profiles.welcomeForm`). |
| `buddies.ts` | Pip and Hop drawn as SVG — **copied from GPS2026felt `src/tour/avatars.ts`**; keep the art in step. |
| `buddyView.ts`, `buddyLines.ts` | The buddy and the crew on screen (`buddySays` / `crewSays`), and what each buddy says. |
| `critters.ts`, `cast.ts` | The woodland crew, drawn in Pip and Hop's style, and who looks after what: Fern the fox (hunts), Maple the moose (badges), Bramble the bear (safety: tick check, grown-up gate), Hoot the owl (facts), Acorn the squirrel (sticker book), Bandit the raccoon (challenges). A new part of the app gets a crew member, not a new character. |
| `tickGuide.ts`, `tickScreen.ts` | The end-of-adventure tick check and the grown-ups' how-to (CDC / Health Canada advice; general information, not medical advice). |
| `look.ts`, `lookApply.ts`, `lookScreen.ts` | "My look", per explorer (`Profile.look`, absence = default — and the default is the **Field Journal** in Storybook letters, `DEFAULT_LOOK`; `BASE_LOOK` is what `:root` draws with no switch, Forest · Bubbly · Round, and only a choice that differs from IT needs a CSS block), nine switches: colours (eleven themes), buttons (Bubbly · Sticker · Flat · Jelly · Outline · Pixel · Pop — each reshapes every control's edge, corners, shadow, fill and lettering), background pattern, top strip, map pins, celebrations (read by `confetti.ts` from `data-party`), word size, letters, moving. Each but the celebration is one `data-` attribute on `<html>`; its CSS (the LOOKS block at the foot of `styles.css`) only re-points tokens or restyles the controls list. Every picker card shows its own choice (`.bs-btn[data-bs]`, `[data-pat]`, `[data-hd]`, `[data-pn]` samples, never one of the real controls), so a new choice needs both blocks (tested). A withdrawn id folds forever in `normalizeLook` (`blocky` → `pixel`). "Surprise me" randomises all but word size and moving. Kids change it themselves — no gate. **Field Journal** (`journal`, an `art` theme) is a whole look, not a palette: paper and ink-frame data URIs, stitched buttons, field-note bubbles, and a plate from the "Scout the Survey Squirrel" storybook taped to the top of each screen (`src/assets/journal/*.webp`, cropped from Fraxinus's own pages; text that is part of the picture — a sign, a pinned note, a specimen label — may stay, the book's dialogue and story text — speech bubbles, narration, page titles, Field Note boxes — never; precached; one per sheet `className`, tested to exist). The map itself is never tinted: it has to be read. It draws its own buttons and title strip, so `lookAttributes` stamps the default button style and header while it is on (`lockedBy`; the picks stay stored and the picker greys those sections) — a chosen style used to put a round Sticker button under the square paper one; and `withTheme` brings the Storybook letters only over the default ones. |
| `walk.ts`, `recorder.ts`, `walkScreens.ts` | "Record my path": streamed GPS fixes kept only where they are movement (`judgePoint`: ≤ 35 m accuracy, ≥ 5 m step, no faster than 12 m/s), saved every few seconds as the path grows, optional screen wake lock; a path left recording when the app closed ends at its last point (`closeOrphan`). Saved paths draw purple, the live one orange. Distinct from the automatic daily trail (`trail.ts`). |
| `compass.ts`, `heading.ts` | The 🧭 facing arrow on the map. Ported from Field Mapper's `OrientationManager` + orientation marker: iOS `webkitCompassHeading`, else an absolute event's `360 − alpha`; `deviceorientationabsolute` with a fall-back to `deviceorientation`. GPS `coords.heading` is course of TRAVEL (null standing still), so it is never used. `heading.ts` is the pure half (reading, short-way smoothing, compass words). The arrow is its own map-aligned marker (`MapView.setFacing`). iOS asks permission only from a tap, so a remembered "on" (`Settings.compass`, device-wide) starts on the first touch. No declination model, as in Field Mapper. |
| `speech.ts`, `voiceRank.ts` | Reading aloud with the device's own voices (never a network voice service). **By default every character has a voice of their own** (`Settings.voiceMode` `'characters'`): `castVoices` gives each a different installed voice where there are enough GOOD ones (within 25 points of the best — never a robotic one just to be different), a higher or deeper one by its `CHARACTER_VOICES` range, plus that character's own pitch (kept within 0.8–1.2) and pace; deterministic, so Hop sounds the same every launch. `say(text, speaker?)`: `buddySays` / `crewSays` / the dock pass who is speaking; anything else is read by the explorer's guide (`setNarrator`, through `activeGuide`, so Scout in the Field Journal). `'one'` is one voice for everyone — `pickVoice`, the best installed English voice (natural / neural / enhanced, Canadian first, never novelty voices) or the one a grown-up picked; a device that already had a picked voice reads as `'one'` (absence rule). The 🔊/🔇 button on the map switches reading aloud. |
| `gps.ts` | The one location watcher. `lastFix()` is a FRESH fix (< 2 min, for placing a find); `knownFix()` is the last one whatever its age — where the avatar is, and what 📍 flies to first (standing still, a phone may send no new position for minutes, which is how the button came to say it was still looking). `refreshFix()` asks for a position now; the watch is restarted when the app comes back from the background. |
| `voice.ts`, `drawPad.ts`, `image.ts`, `speech.ts`, `sound.ts`, `confetti.ts`, `gps.ts`, `trail.ts`, `exportData.ts` | One job each. |

**Pure, DOM-free and unit-tested:** `badges.ts`, `challenges.ts`, `hunts.ts`, `gate.ts`, `csv.ts`,
`geo.ts`, `categories.ts`, `buddies.ts`, `buddyLines.ts`, `critters.ts`, `cast.ts`, `tickGuide.ts`, `guides.ts`,
`findModel.ts`, `species.ts`, `familiar.ts`, `ids.ts`, `walk.ts`, `voiceRank.ts`, `heading.ts`, `look.ts`, `tiers.ts`, `sproutArt.ts`. Keep logic there and the DOM out of them.

## Species lists

`public/species/ns.json` is GENERATED from Fraxinus Field Mapper's ACCDC lists by
`node scripts/import-fieldmapper-species.mjs --from ../GPS2026felt [--region ns|nb|pe|nl|lb]` — re-run it, never
hand-edit. It keeps named species, drops accidental / doubtful / unconfirmed / false-report / absent / hybrid records
and unranked (SU) invertebrates, and folds subspecies by common name. It is precached so naming works offline. A
grown-up can also import any Field Mapper `db-*.json` file or a CSV (Grown-up corner ▸ Species lists).

**Mushrooms** are their own kind (`mushroom`, list taxon `Fungus` — the ~585 named macrofungi in `ns.json`, which used to sit
under Plant). They are deliberately NOT in `badges.COLLECTABLE`: badges are derived, so adding a kind to "One of
Everything" would take that badge away from every explorer who already earned it. Every mushroom line says never eat one.

## Rules

- **Field Mapper first.** Before building anything Field Mapper already does — anything on the map, location,
  compass, gestures, layers, capture, photos, storage, sync of state — read how `fraxinusenviro/GPS2026felt` does it
  (cloned beside this repo at `../GPS2026felt`) and port its approach, naming the source in a comment ("Field Mapper's
  `MapManager.bindLongPress`"). It has met the field problems already; a fresh design here re-meets them. Depart from
  it only for a stated reason (a child's needs, a bug of its own) and say so in the comment. Counterparts so far:
  long press (`MapManager.bindLongPress`), compass and facing arrow (`OrientationManager` + the orientation marker),
  locate (`App.ts` `#btn-locate` + `CaptureManager.getGPSState`, watch options in `startGPSWatch`), the folding right
  rail (`#btn-collapse-right`), avatars (`src/tour/avatars.ts`), species lists (ACCDC `db-*.json`).

- **Child safety and privacy first.** No accounts, no uploads, no analytics, no third-party requests
  beyond the map tiles. Anything destructive or outward (delete, export, settings) sits behind the
  grown-up gate in Explorer mode. Exact coordinates are shown only in Together mode.
- **Colours, borders and corners are tokens** (`--bg`, `--card`, `--ink`, `--green` (the accent), `--good-soft`…, `--bw`,
  `--radius`): never hard-code a colour in a new rule, or a theme (Night above all) will miss it.
- **Age tiers** (`tiers.ts`, `Profile.tier`, absence = Explorer): Phase 1 is built (the tier is recorded and chosen);
  the per-tier behaviour is planned in `docs/AGE_TIERS.md` — read it, and its Decisions, before adding anything
  age-specific. The modes are called "On my own" / "Together" on screen (`MODE_WORDS`); the stored values are unchanged.
- **All text goes through `textContent`** (`ui.ts` `h()`); the only `innerHTML` is the buddy SVG,
  which is our own constant markup.
- **Words are short and are read aloud** (`say()`); every button has an emoji and a word.
- **Blank is not zero**: a find with no location is simply not on the map; nothing is invented.
- **A hunt is stored BY VALUE on its run**, so editing a custom hunt never changes a hunt already
  under way or won. A deleted find re-opens the hunt item it ticked.
- **Badges and challenges are derived** from the finds (and finished-hunt and tick-check counts); nothing is stored for them.
- **Finds, hunt runs, recorded paths and tick checks belong to a profile**; custom hunts, species lists and device settings are shared.
- **A place is only what was chosen**: GPS (accuracy kept), a tapped spot (`placeBy: 'map'`, no accuracy), or none.
- **Pictures are stored as BYTES, never as Blobs** (`storedBytes.ts`: `{ __bytes: ArrayBuffer, type }` for every
  picture, thumbnail, voice note and profile photo). Safari keeps a stored Blob as a separate file the page can lose
  its hold on — photos turned into broken images after an edit, then just from opening a find (WebKitBlobResource
  error 1). Bytes live inside the record and come back as memory. `storage.ts` is the only place that knows:
  `reviveFind` / `allProfiles` rebuild in-memory Blobs on read and rewrite any record still holding a Blob, once,
  while it can still be read (never one Safari can no longer read: rewriting it would delete the file for good);
  `saveFind` / `saveProfile` store bytes and **return the copy, which callers must keep** (`ProfileHost.save` too).
- **`#map` is its own stacking context (`z-index: 0`)**, so a marker's `z-index` (the explorer above the pins) ranks it among the map's markers only; without it the explorer's avatar drew over the bottom buttons.
- **Never style a MapLibre marker's own element with `position` or `transform`**: MapLibre positions it (absolute plus an
  inline transform). A `position: relative` there put every pin in normal flow, so pins drifted as the map zoomed. Draw
  inside an inner element (`.find-pin`, `.me-inner`).
- **Changing the IndexedDB schema** needs a `DB_VERSION` bump and an upgrade path in `storage.ts`.
- **Tile caching**: OpenFreeMap tiles/glyphs/sprites and Esri imagery tiles are `CacheFirst`; the style and TileJSON are
  `NetworkFirst` because they name the current data release. Keep it that way. Imagery is capped at z18 and overzoomed.
