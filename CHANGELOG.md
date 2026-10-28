# Changelog

Scout's versions, newest first. The version lives in `package.json`; `src/releaseNotes.ts` carries the same
releases in words for the family (shown as "What's new" on the opening screen), and `test/releaseNotes.test.ts`
holds the three together. **Every release bumps `package.json`, adds an entry here and one in `releaseNotes.ts`.**
Versions before 2.0.0 were numbered when 2.0 started tracking them, from the git history.

## 2.3.1 — 2026-10-28

- MapLibre's worker is emitted as `.js` (`vite.config.ts` `assetFileNames`), not `.mjs`: a module worker is refused
  unless served as JavaScript, and not every host types `.mjs` so. The precache pattern is back to `.js`.

## 2.3.0 — 2026-10-28

A safety pass, from a review of privacy, security, kid-friendliness and layout.

- **Reading aloud never sends words over the internet by itself** (`voiceRank.onDevice` / `isCloudVoice`): only
  device voices are ranked and cast ("online" left the natural-voice bonus). Edge had been picking "Microsoft …
  Online (Natural)" and Chrome "Google US English", which send every word read (the explorer's name among them)
  to Microsoft or Google. A grown-up can still pick a cloud voice: it is listed last, marked ☁️, and asked about;
  `Settings.voiceCloudOk` records the yes, and a cloud voice picked before this is not used until confirmed.
- **MapLibre 6.16** (critical advisory GHSA-jrc7-96c5-q579 in ≤ 6.4.0, an HTML-sanitizer bypass reachable through
  map attribution). v6 has no default export and finds its worker beside its own file, so `mapView.ts` hands it the
  worker Vite emits (`setWorkerUrl`), and `.mjs` joins the precache.
- **Content-Security-Policy and no referrer** in `index.html`: Scout, OpenFreeMap and Esri imagery, nothing else;
  scripts from Scout alone. The boot fallback left the page for `public/boot.js`, built with `textContent` (the
  reason it shows can carry an error message).
- **The gate**: a new sum after every wrong answer, and three misses in a row pause it for a minute, kept across a
  reload (`gate.afterMiss` / `readLock`, tested).
- **Removing a saved photo, drawing or voice note asks a grown-up in "On my own" mode** (it was possible through
  ✏️ Change it with no gate); a voice note is always asked about.
- **Yes / no questions put the safe answer first** (`askYesNo`, `kind` `'danger'` by default; the losing answer
  is second, quieter, in the new `--danger` token). Only the tick-check question is `'go'`.
- **Export** says what the file holds and offers **rough places** (on by default): finds and drawings rounded to
  about 100 m (`exportData.roughPlace`), recorded paths left out, the README saying which (tested).
- **Read aloud is asked in the welcome**, on by default for a Sprout (who cannot read yet).
- **Safety words**: water (the Water cheer, the Beach Hunt), plants (no "how does the leaf feel?"; poison ivy), wild
  animals (watch from far away, never touch or feed); "How to use" says them too.
- **Pictures**: the tick-check plate no longer shows a bear and cub (Scout with his clipboard instead); the
  challenges plate's "BREAKING ELLIOTT" poster title is covered with blank paper. Two stray screenshots left the
  repository root. A long press on a picture no longer offers iOS's Share / Save to Photos.
- **Privacy words** say what is true: the map services see the device's address and roughly where the map looks.
- **Layout**: a phone on its side gets the side buttons along the top (only two fitted down the side), a two-column
  opening screen and a scrolling gate; the installed app may turn any way (it was locked to portrait). Small round
  buttons are 48 px and the photo remove button 44 px. A notice over a screen sits at the foot, not over the
  guide's instructions.

## 2.2.0 — 2026-10-28

- **Tap a drawing or a saved path on the map** to open its card (`shapeCard.ts`): what it is, how long or big (in
  metres and kid words), when, a name box (kept as typed), 🔍 see all of it, ✏️ Change it (drawings) and 🗑️ Delete
  (the gate in "On my own" mode, as in the lists). A pale halo shows which one was tapped (`MapView.setPicked`); a
  tap on empty map closes the card. A recorded path can be named but not reshaped: it is where the explorer walked.
- **The pick is Field Mapper's**: `src/geometryHit.ts` is COPIED from Field Mapper's `lib/geometryHit.ts` with its
  test (a line measured to its segments, a tap inside a shape counts, ties to the smaller shape); `mapShapes.ts`
  (pure, tested) builds the pool from what is drawn and allows 22 px (Field Mapper: 14) for a child's finger.
- **✏️ Change it reopens ✏️ Draw on the drawing** (`openDrawTool(..., editing)`): its own dots, shape and colour;
  Save writes it back under the same id; ✖ with changes asks first. The drawing is left off the map while its dots
  are the draft (`App.paintSketches`).
- **Dots can be dragged**, in every drawing and measurement (`MapView.onDraftDrag`, Field Mapper's GeometryEditor
  vertex drag): a press within 24 px of a dot takes the gesture from the map's panning, and the click that ends the
  drag is swallowed.

## 2.1.3 — 2026-10-28

- **Scout's own icons** (`src/icons.ts`): close, back, forward, speaker and the rail's fold caret, drawn as one inked
  line in `currentColor` instead of the emoji font's ✖️ ⬅️ ➡️ 🔊 (which every system draws differently — Windows as
  blue tiles). Used in every sheet's ✖, the find steps' arrows, Next / Back on the welcome and the find steps, the
  small remove buttons, the speech bubbles' speaker and the rail. `test/icons.test.ts` holds them to the ink colour.
- **Desktop layout**: on a wide screen every sheet keeps to one centred 720 px column, its header included (the ✖ and
  arrows sat at the far edges of the window, and a text box, the describe headings and the microphone escaped the
  column). The name chip on the map no longer stretches across the window, and the bottom bar is centred.

## 2.1.2 — 2026-10-28

- **⬅️ and ➡️ at the top of the find steps**, either side of the progress (`paintNav` in `capture.ts`). Forward is
  offered once the step can be left (not before the kind is picked) and not on the save screen; back closes the
  drawing pad or the Where detour. Editing a find has ⬅️ back to its summary. Every "⬅️ Go back" / "⬅️ Back" button
  at the foot of a step is gone.
- **Text boxes in the Field Journal look have an inked edge**, a light page, an inset shadow and a clear ring while
  in use (they were a dashed line on transparent paper).

## 2.1.1 — 2026-10-25

- **The find steps' header is one slim row**: ✖ and the progress (`.sheet.slim-head`). "I found something!" is no
  longer shown on every step (it stays the sheet's accessible name); the guide's bubble says what each step wants.
  Editing a find keeps its "Change my find" title. Every sheet's header is a little thinner (46 px close button).
- **Storybook plates re-cropped from the book pages so Scout's face is in them**: the find steps now use the
  clipboard-by-the-stream page, whole, at the FOOT of the page under the buttons (the thin strip at the top cut his
  head off); the hunts plate is the winter tracking page; the challenges plate has the blue jay and Scout both.
  A plate may set `--plate-ratio` / `--plate-pos` to match its crop.
- **The guide's bubble has no name line in the Field Journal look** ("Field Note · Scout the Survey Squirrel"): it
  comes from his portrait, which says who is speaking. Crew bubbles keep theirs, which carry their job.

## 2.1.0 — 2026-10-25

- **Quick finds are per explorer and off by default** (`Profile.quick`, absent = off). Turned on in 🔧 My buttons,
  with the kinds to show: up to three picked (`pickedKinds` / `toggleQuickKind`), or none picked = the kinds the
  explorer finds most, as before. The device-wide `Settings.quickFinds` switch is retired and no longer read
  (every device had stored `true` from the old default); the grown-up corner says where the switch went.
- **Text stays inside its box**: the quick-find chips gave "Tracks & scat" a fixed share of the screen and let the
  word run past the chip's edge. Chips now share the row, the word shortens with … if it must, and a category can
  carry a short word for small buttons (`Category.short`: "Tracks"). Buttons and cards break a long word onto a new
  line rather than spill it (big text sizes and wide letters). On a phone the chips put the emoji above the word
  and the word steps down a size if it must; the name chip at the top tightens so a short name is never cut.
- "I'll pick" starts from the kinds already showing, so nothing changes until a kind is tapped.

## 2.0.0 — 2026-10-25

- **Opening screen** (`launch.ts`), once per launch (never on coming back from the background): a logo, the guide
  and crew welcoming the explorer by name, who's exploring, 🚀 Start adventure, My finds, Badges, My look,
  My buttons, How to use, the grown-up corner, and What's new with the version.
- **Logos** (`logos.ts`): Field Notes (the storybook label, shown in the Field Journal look), Trail Badge (shown in
  the other looks) and Playful.
- **How to use** (`help.ts`): the finding, the map buttons, badges and hunts, staying safe, and a part for grown-ups.
- **✏️ Draw and 📏 Measure** (`drawTool.ts`, `measure.ts`): tap points on the map for a line or a shape, as Field
  Mapper's MeasurePanel works; length and area in metres and in kid steps, bedrooms, tennis courts and soccer
  fields. Drawings are saved per explorer (IndexedDB `sketches`, `DB_VERSION` 5), listed in My drawings and
  exported as `drawings.geojson`.
- **My buttons** (`railTools.ts`, `buttonsScreen.ts`): each explorer chooses and orders their map buttons;
  absent a choice, their age tier's default (Sprout: Me · Draw · Hunts · Done; Explorer adds Map and Path;
  Naturalist adds Measure).
- **Storybook avatars** (`avatarArt.ts`, `avatars.ts`, `src/assets/avatars/`): eleven portraits from the
  "Scout the Survey Squirrel" pages for the card picture; the map marker can be the same picture or its own
  (`Profile.mapAvatar`).
- **Versions are tracked**: this changelog, `releaseNotes.ts`, and the version on the opening screen and in the
  grown-up corner.

## 1.2.0 — 2026-10-25

- The find flow, shortened: ✨ Save now after the kind; colours, size and count on one screen; Where asked only
  when the GPS cannot answer; voice notes and Save on one screen; the explorer's own words for a species; Sprouts
  get three screens.
- 📸 Quick finds, ported from Field Mapper's Quick Entry bar.
- Several voice notes per find, with a ➕.
- The celebration goes back to the map by itself.
- Reading aloud is off until a grown-up turns it on; a tapped speech bubble is always read.
- Tracking only when 👣 Path is on (the automatic daily trail is off unless a grown-up turns it on); paths break
  at GPS gaps.
- The side rail condensed to labelled buttons; 📍 Me is locate and follow in one; the Map card.
- ✖ closes screens.
- Field Mapper ports: the find photo store, the steadied GPS fix, the service-worker update policy, Follow, the
  wake lock.
- Photos from the library onto a find.

## 1.1.0 — 2026-10-24

- The Field Journal look (the default), with Scout the Survey Squirrel as the guide.
- Mushrooms as their own kind; the facing arrow (compass).
- A voice of their own for every character.
- Pictures stored as bytes, so Safari cannot lose them.
- Press and hold the map to place a find; the folding side rail; the profile photo from the library.

## 1.0.0 — 2026-10-23

- Finds on a map with photos, drawings and a voice note; species names from the ACCDC lists.
- Explorer profiles, any guide, Explorer and Together modes, age tiers.
- Badges, challenges, scavenger hunts, the tick check and the woodland crew.
- Record my path; My look; map styles; editing a find.
