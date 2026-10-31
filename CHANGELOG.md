# Changelog

Scout's versions, newest first. The version lives in `package.json`; `src/releaseNotes.ts` carries the same
releases in words for the family (shown as "What's new" on the opening screen), and `test/releaseNotes.test.ts`
holds the three together. **Every release bumps `package.json`, adds an entry here and one in `releaseNotes.ts`.**
Versions before 2.0.0 were numbered when 2.0 started tracking them, from the git history.

## 2.12.0 — 2026-10-31

- **The two buttons beside "I found something!" are the explorer's choice** (`Profile.bar`, left then right;
  `railTools.barFor`, tested). Absent a choice they are 📖 My Finds on the left and 📷 Photo on the right. Any map
  button can go there, and My Finds and Badges are now map buttons like the rest (`TOOLS` rows `finds`, `badges`), so
  either can go on the rail too. A button is in one place or the other, never both: the rail is the explorer's list
  less the bar's two (`railFor`).
- **Putting a button in the bar swaps out the one there** (`placeInBar`, tested): it takes the new one's spot on the
  rail, or the other side of the bar, or the end of the rail when the new one was in neither, so no button is lost.
  🔧 My buttons shows the bar as it looks on the map: tap a side, then the button to put there.
- **🏅 Badges moved to the rail in 📷 Photo's place**, in every tier's default (`TIER_TOOLS`). A rail an explorer chose
  before 2.12 (`Profile.tools`) is read with the same swap (`railFromOld`: Badges where Photo was, else at the end), so
  nothing that was on their screen leaves it; their next change in My buttons saves it the new way (`Profile.rail`) and
  drops the old field. "Back to the … buttons" resets the rail and the bar.
- **One element per button, moved between the two places** (`App.paintRail`, `seatTool`): it takes the bar's look in
  the bar and the round look on the rail, and whatever lights it (following, recording, a tool open) lights it in
  either. My Finds says "Finds" on the narrow rail. 👣 Path in the bar while the grown-ups have it off keeps its place
  empty, so "I found something!" stays in the middle.
- **The bar fits a 320 px phone with the biggest words and Chunky letters.** Zoomed 1.1, its right-hand button ran
  off the screen (Badges did in 2.11): below 380 px the bar's gaps, side padding and the buttons' least width give way,
  since "something!" cannot break. My buttons' copy of the bar shows the pill's ✨ alone on a phone.

## 2.11.0 — 2026-10-29

- **A rare find gets the crew's party** (`rarity.ts`, tested). A species picked from the list counts as rare when it is a
  species of conservation interest by Field Mapper's own rule (`inventorySurvey.isSoCI`, ported unchanged: an S-rank of
  S3 or rarer by the first part of the rank — S1, S2, S3, S3S4, S2?B, S1B,S4N — or a listing under the province's
  Endangered Species Act) or is listed under Canada's Species at Risk Act (endangered, threatened, special concern,
  extirpated). 1180 of the 6362 species in the Nova Scotia list qualify. The celebration then: a gold ring round the
  sticker; Fern, Maple, Bandit and Acorn hopping under "🌟 You found a rare species!" (less the explorer's guide if it is
  one of them); Hoot saying why it is rare in place of the usual fact; Bramble's "Leave it just as you found it, and tell
  a grown-up about it."; a second burst of confetti and a longer fanfare (`sounds.rare`); six seconds more before it
  goes back to the map. A calm look keeps it still.
- **The words come from the lists and claim nothing more** (`rareLines`): how rare by the rarest digit ("One of the
  rarest living things in Nova Scotia" · "Rare in Nova Scotia: only a few places have it" · "Uncommon in Nova Scotia: not
  many places have it"), the season when only one is rare ("Very few of these breed in Nova Scotia" for S1B,S4N), and
  "Nova Scotia's list of species at risk says it is vulnerable" / "Canada's list of species at risk says it is of
  special concern". No "protected by law": what a listing protects depends on the species and the land. A list a
  grown-up imported says "this province".
- **The statuses ride on the find** (`SpeciesPick.status`: rank, provincial and SARA status, and the province), kept by
  value when the species is picked, as Field Mapper keeps a species record on an observation. Finds named before 2.11
  carry none and are not marked. The species step's chosen card says "🌟 A rare one!", and the find's page gives the
  first reason.
- **The species list carries the two statuses**: `scripts/import-fieldmapper-species.mjs` now writes `p` (Field Mapper's
  `sprot`, the provincial Act) and `f` (`nprotSar`, SARA) beside the rank; `public/species/ns.json` regenerated from the
  same Field Mapper commit, with the same 6362 species. An imported Field Mapper list keeps them too
  (`parseFieldMapperList`). The loaded list knows its province (`Species.w`, set on load from the file's region).

## 2.10.0 — 2026-10-29

- **Favourites are each explorer's own** (`favourites.ts`, tested; `Profile.favourites`, find ids, absent = none): any
  find on the device can be a favourite, another explorer's too — ❤️ Favourite is now on the look-only page of
  someone else's find. A find's old `favourite` flag is moved once, at launch, onto its finder's list
  (`migrateFavourites`; a find from before profiles goes to the explorer exploring) and the flag is removed. The find
  page says who loves it ("❤️ Loved by", with their pictures); the sticker book's ❤️ shows the active explorer's
  favourites within whose finds are shown; **profile cards** ("Who's exploring?") show each explorer's ❤️ count and the
  last four finds they loved (`favouriteFinds`). The export's `favourite` column is `loved_by` (explorer names).
  `pictureOf` moved to `findPicture.ts` so the book and the cards draw a find alike.
- **Everyone's finds is on by default** (`Profile.mapEveryone`: absent now = shown, `false` = just theirs). An explorer
  who turned it off keeps it off.
- **"Not sure" left the first screen of "What is it?"**: 🧩 Other ("Something else or not sure") covers it, and it left
  the quick-find choices too. Finds saved as a mystery stay one (their book shelf is now called Mystery, and an edit
  lights Other). Bandit's "Find a mystery" challenge asks for an Other instead (an old mystery still counts). The lichen
  group's own kind is "Just a lichen" (it said "Not sure").
- **🤷 Not sure beside the species name box**: one tap goes on without a name. It replaces "I don't know yet" at the foot
  of the step.
- **Habitats ask "What kind of place?" instead of a species** (`habitats.ts`, tested; `Find.habitat`, `{ name, own? }`,
  absent = not said): every kind in the Habitat group — water too, whose species step (what lives in it) is gone; a fish
  or a frog is an animal find. The step mirrors the species step: the explorer's own words in the box, the places of
  Nova Scotia for that kind as picks, each with a line that tells it apart (Softwood forest · Hardwood forest ·
  Mixedwood forest · Bog · Fen · Marsh · Swamp · Salt marsh · Barrens · Blueberry field · Mudflat · Puffy clouds…, 63 in
  all), and a search over every kind of place by name or line ("cumulus" finds Puffy clouds). Picking one of another kind
  asks to change the find's kind ("Salt marsh is a kind of wetland. Make this find Wetland?"); everyday places
  (backyard, schoolyard, park) never ask. Water, wetland and beach finds carry Ranger Bramble's water safety line. The
  kind of place names the find (`findName`: name › species › place › kind), shows on its page with its line, is a row
  of Change it, and is exported (`habitat`, `habitat_own_name`).

## 2.9.0 — 2026-10-29

- **"On each pin"** (🗺️ Map card; `Settings.pinShow`, device-wide, a part absent = shown, `pinFace.pinParts`): three
  switches — 🖼️ Picture (the first photo or drawing), 🌿 Kind, 👫 Who found it (with more than one explorer; it shows
  while Everyone's finds is on). Each part switched on appears ONCE (`pinFace.pinLayout`, tested): the pin holds the
  first of picture › kind › finder that it has, and the rest stand as small badges. Nothing switched on leaves a plain
  pin in its kind's colour.
- **The badges stand in one column down the pin's right side.** In 2.8 a pin with a photo carried its kind in the top
  right and its finder in the top left, which read as a pair of ears. A finder no longer takes a corner of its own.

## 2.8.0 — 2026-10-29

- **Who found what, on the map**: while Everyone's finds is on, EVERY pin wears its finder's map picture, the
  explorer's own too (they were bare, so only the others' were marked); each pin's label says who found it. The
  explorer's own still sit on top.
- **"Whose finds?" in My Finds** (`openBook`), with more than one explorer on the device: 👫 Everyone, then each
  explorer (their picture, name and count), the one exploring first. It opens on the explorer's own finds, or on
  everyone's while the map shows everyone's. The kind chips and favourites filter within it. A sticker shows who found
  it whenever the book shows more than one explorer's finds (or someone else's), and another explorer's opens to look
  at, as from the map: no favourite, change or delete. Badges, hunts and Acorn's sticker count stay the explorer's own.
- `findModel.observerOf` (a find from before profiles counts as whoever is exploring) and `bookFinds` (tested) decide
  whose a find is, for the map and the book alike.

## 2.7.0 — 2026-10-29

- **Any species from any kind** (`species.searchSpecies`): the search reaches the whole list, not only the taxa of the
  find's kind. Within names starting with the words typed, the find's own kind comes first; each result says what kind
  it is (its emoji and taxon). **Picking one from another kind asks** (`speciesKind.kindToOffer`, Y/N): "Turkey Tail is a
  kind of shelf mushroom. Make this find Shelf mushroom?" Yes changes the kind (a track's clue is dropped, and that one
  asks with the safe answer first); No keeps both as they are. A mystery or "Other" that gets a name is asked too. The
  kind offered is the most particular one whose familiar species list names it (Red Maple → tree, Turkey Tail → shelf,
  Map Lichen → crusty), else the kind of its taxon (`TAXON_KIND`; a taxon not in it — an imported list's "Other" —
  asks nothing). Habitats, rock and sky still have no species step.
- **🧩 Other** (`other`), a top-level choice beside ❓ Not sure: something that is not a plant, an animal, a mushroom, a
  lichen or a place. It has a species step that searches everything, a shelf of its own in the sticker book, and is
  not in a group or in "One of Everything".
- **Three sizes of pins** (🗺️ Map ▸ Size of pins: Small · Medium · Big; `Settings.pinSize`, device-wide, absent =
  medium): finds' pins (34 / 46 / 62 px) and photo spots (42 / 56 / 74 px), every measure of both drawn from two CSS
  variables (`--pin`, `--spot`) set by `html[data-pin-size]`.
- **"Another shape" has a drawing: a coral fungus** (`kindArt` `coral`), with the hint "Coral, jelly or cups", so it
  no longer looks like Cap and stem. It is the `mushroom` kind's picture everywhere, so mushroom finds saved as plain
  "Mushroom" before 2.5 (and by a Sprout, who picks only the group) show the coral too.
- **Quick finds are the top of "What is it?" only** (`QUICK_CHOICES`: the five groups, Other and Not sure), saved as
  that and refined later with Change it. A pick stored before (Bird, Bug…) folds to its group (Animal), and the most-found
  choices count finds by group.

## 2.6.0 — 2026-10-29

- **Everyone's finds** (👫, the 🗺️ Map card): the map shows the finds of every explorer on THIS device, not just the
  one exploring. Shown only where there is more than one explorer; per explorer (`Profile.mapEveryone`, absent = just
  theirs), so each child chooses. Nothing leaves the device: these are profiles sharing one tablet, and no account,
  server or upload is involved. Seeing finds from other phones or tablets would need accounts and a server, which Scout's
  privacy rule does not allow; it was considered and left out.
- Another explorer's pin wears their map picture on its top-left and sits under the explorer's own pins; its label says
  who found it. Tapping it opens the find to LOOK at (`openFind`'s `owner`): "Found by Elliott" with the same picture,
  the pictures, facts and Show on map — no Favourite, no Change it, no Throw away.
- Badges, challenges, hunts, the sticker book and the export still count and hold only the explorer's own finds.
- The split is `findModel.mapFinds` (tested): a find saved before explorers had profiles counts as whoever is exploring,
  as it does everywhere else, so it is never shown as someone else's.

## 2.5.1 — 2026-10-29

- **A find is called by what it is** (`categories.findName`): its own name, else its species (picked from the list or
  the explorer's own words), else its kind — on the sticker-book stickers, the find's page title, a photo's alt text and
  the map pin's label. The kind's picture already sits beside it, so the sticker no longer repeats "Plant" under a 🌿.
- A sticker's name takes up to three lines before it gives way with …, for long species names ("Eastern Red-backed
  Salamander").

## 2.5.0 — 2026-10-29

- **"What is it?" is two steps: a GROUP, then a KIND** (`categories.GROUPS`): 🌿 Plant · 🐾 Animal · 🍄 Mushroom ·
  Lichen · 🏞️ Habitat, plus ❓ Not sure (the mystery). Each group opens its kinds, then the species screen:
  - Plant: tree, shrub, flower, fern, moss, grass, "just a plant";
  - Animal: bird, mammal, bug, frog or salamander, snake or turtle, fish, snail or slug, tracks & scat, "just an animal";
  - Mushroom (a SHAPE step): cap and stem, shelf, puffball, "another shape";
  - Lichen (a shape step): crusty, leafy, bushy, "not sure";
  - Habitat (places, and rock, water and sky): forest, meadow, wetland, water, beach, rock, sky, "another place".
  A short hint under a kind helps a child choose ("Flat like paint"). Going back to the step opens the group of the kind
  already picked; ⬅️ in the header and "Not a lichen?" go back to the groups. **A Sprout picks the group and stops
  there** (its own kind, e.g. `lichen`): three screens, as before.
- **The twelve kinds keep their ids and meaning**; each new kind names the older kind it is a kind of (`refines`: a fern
  is a `plant`, a shelf a `mushroom`, a mammal an `animal`) and everything that counts kinds asks `isKind`, so badges,
  daily challenges and hunt items written for the older kind still tick. No find is changed or migrated. A tree and a
  bird still do not count as "a plant" or "an animal", as before. "One of Everything" is unchanged.
- **Drawings for kinds no emoji says** (`kindArt.ts`, in the crew's sticker style): lichen, crusty, leafy and bushy
  lichens, moss, a shelf mushroom, a puffball and a wetland — on the choice buttons, map pins, stickers, the find page,
  quick-find chips and the My buttons picker (`kindIcon.ts`, sized in em so they stand where an emoji would).
- **Species narrowed by kind** (`CATEGORY_TAXA`): a fern searches ferns, moss mosses and liverworts, a snail molluscs, a
  shelf fungi, a crusty lichen lichens. Lichens left the plant search (they have their own group); molluscs left the bug
  search (snails and slugs have their own kind). Water now also searches birds and reptiles, which its own quick picks
  (ducks, turtles) already were. Familiar species for every new kind, each held by a test to be in its kind's taxa.
- **Two badges**: Lichen Looker (3 lichens) and Habitat Explorer (3 different kinds of place: forest, meadow, wetland,
  water, beach, or another place). **Two daily challenges** (find a lichen, find a fern): the pool is longer, so the
  challenges shown on the day of the update may change once. **Hunt items** for a lichen and a fern; the Forest Hunt has
  them (a hunt already started keeps its own list).
- The sticker book's chips are the groups. A find's page, sticker and pin name a kind in full ("Shelf mushroom",
  "Bushy lichen"); "You found…" reads "some water", "the sky" rather than "a water". The export has a `group` column.
- Fixed: the step dots in the find screens could push the ➡️ button off a 320 px screen; they now shrink to fit.

## 2.4.3 — 2026-10-29

- **Photo spots are Field Mapper's photo-point symbol** (`MapManager.drawPhotoPointIcon`, ported to `MapView.spotIcon`):
  an orange observer dot with a white edge, under a 70° view wedge at 75% with a white edge, pointing the way the camera
  looked — one fixed size like Field Mapper's `icon-size` (56 px here for a child's finger; Field Mapper's is about 27),
  with a small camera in the dot, kept upright while the wedge turns. **No photo on the map**: the round photo badge of
  2.4.2 read as one more find, and a find is a pin with its picture. The picture is on the spot's page.
- The zoom scaling of 2.4.1–2.4.2 is gone with it (`spotScale`, `beamOpacity`): a symbol the size of a find pin needs
  none, as in Field Mapper.
- While a spot is being saved its preview sits above the explorer's marker, so the wedge can be seen turning.

## 2.4.2 — 2026-10-29

- **Photo spots redrawn as ONE icon** (`MapView.spotIcon`): a round photo badge centred on the spot (white ring, orange
  edge, a small camera mark — our own `camera` icon, not the emoji), over a BEAM that is strongest at the badge and
  fades to nothing. It was a teardrop pin standing above the point beside a flat see-through wedge from its tip: two
  markers that scaled two different ways (the wedge halved per zoom level, the pin eased linearly), and the wedge turned
  to mud over satellite imagery. Now one marker scales as one piece (`photoSpots.spotScale`: full from zoom 18, 0.65 at
  zoom 14 and out), and the beam fades out between zoom 16 and 15 (`beamOpacity`), leaving the badge alone zoomed far
  out. The beam turns with `--brg` less the map's own bearing (`--map-brg`), so it stays true if the map is turned.
- **The explorer's marker lets taps through** (`.me-marker { pointer-events: none }`), so a spot or a find saved right
  where they stand still opens.
- A spot with no picture shows the camera in the badge; one with no known way has no beam.

## 2.4.1 — 2026-10-28

- **Photo spots scale with the map.** The wedge was drawn at one screen size at every zoom, so zoomed out it covered
  the places it pointed at. It now shrinks with the ground below zoom 18, as Field Mapper's metre-sized cone does
  (`photoSpots.wedgeScale`: half the size per zoom level out), stops growing at zoom 18 so it stays readable zoomed in,
  and is not drawn below an eighth of its size (about zoom 15). The pin eases from full size at zoom 18 to 0.6 at
  zoom 14 (`spotPinScale`). Both are CSS variables (`--spot-scale`, `--spot-pin-scale`) set on the map on every zoom.
- The full-size wedge is a little longer (140 px), so at the everyday zoom (17) one pointing north still shows past
  its pin. Saving a spot zooms to 18, where its wedge is full size.

## 2.4.0 — 2026-10-28

**Photo spots**, ported from Fraxinus Field Mapper's photo points (`PhotoPointData`, `PhotoCapturePanel`, the view cone
of `MapManager.buildPhotoPointCone`).

- **📷 Photo** on the map rail (in every tier's default buttons; an explorer who chose their own adds it in 🔧 My
  buttons) opens a card at the foot of the map. Its tap starts the compass (iOS asks permission only from a tap), so
  the facing arrow shows the way while the explorer aims. **📷 Take the picture** opens the camera and reads, at that
  tap, the compass heading and the steadied fix (`steadyNow`, as a quick find).
- After the picture: **which way were you looking?** — eight arrows and a **?**, the compass's arrow lit. A bearing is
  stored in whole degrees with `facingBy` `compass` or `chosen`; **?** keeps it blank (Field Mapper's bearing is a
  required number; here an unknown way draws no wedge rather than one pointing north). A name, and the place: where
  the explorer stands, or a spot tapped on the map. A photo's own EXIF location is never read.
- **On the map**: a round pin with the newest picture, over an orange wedge pointing the way (Field Mapper's colour and
  white edge), at screen size rather than 15 m of ground, so it reads at every zoom. The wedge is tappable too.
- **The spot page**: the picture, the date and way, every picture taken here in a strip, a name, 🔁 **Take it again**
  (the card shows last time's picture, the way to look and how far away the spot is; the new picture joins the spot
  without moving it), 🗺️ On the map, and deleting a picture or the spot (a grown-up asked in "On my own" mode).
  Exact coordinates only in Together mode.
- **My photo spots**: a list, from the card's 📋 and from My Finds.
- **Storage**: `DB_VERSION` 6 adds `photoSpots` (light: the shots and a thumbnail) and `spotMedia` (the pictures, as
  bytes), split as a find's are; both belong to a profile and go with it.
- **Badges**: 🖼️ Photo Spotter (3 photo spots) and 🔁 Then and Now (a spot taken again on another day).
- **Export**: `photo-spots.geojson` (a point per spot with its bearing, and Field Mapper's 15 m, 50° view wedge where
  the way is known; rough places round both) and every picture under `photo-spots/`.
- Deleting everything in the grown-up corner now also forgets the drawings on screen (they were cleared from the
  database but stayed drawn until a reload).

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
