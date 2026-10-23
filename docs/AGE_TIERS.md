# Age tiers: Sprout · Explorer · Naturalist

**Status: Phase 1 built** (the tier on the explorer's card, the welcome asks for it, modes renamed); phases 2–5 planned. Scout grows with the child: the same app, the same finds, but what it asks,
how it says it and which tools it offers change as they get older — the way a family of nature
magazines moves a reader from pictures to field notes.

## 1. The one rule

**A tier changes what is asked, how it is said and which tools are offered — never what is stored.**
Every tier writes the same `Find`. A child who moves up keeps every sticker, badge, path and trophy, and a
find made as a Sprout opens perfectly well as a Naturalist (its unasked questions are simply blank — blank
is not zero). Moving back down loses nothing either.

## 2. The tiers

| | 🌱 Sprout | 🧭 Explorer | 🔬 Naturalist |
|---|---|---|---|
| Roughly | 4–6, pre-readers | 7–9, early readers | 10–12, confident readers |
| Reading | Everything spoken; words are labels on pictures | Short sentences, read aloud by default | Full sentences; read aloud optional |
| Typing | None | Optional (a name, a search) | Expected (notes, measurements) |
| "I found something!" | 3 taps: picture → what is it → done (place automatic) | Today's flow | Today's flow + field-notebook questions |
| Naming species | Big picture buttons for ~20 familiar species, no search | Familiar buttons + search (today) | Search with scientific names, look-alikes, provincial rank explained |
| Place | Automatic GPS; no choice shown | GPS / tap the map / none (today) | Plus accuracy in metres, coordinates, compass bearing |
| Map | Me and my stickers; no style switch | Today's map | Plus measure-a-distance, coordinates readout, study plots |
| Hunts | 3–4 picture items, always auto-ticked | Today's hunts | Longer hunts, counts ("find 5 different birds"), timed surveys |
| Badges | Few, generous, celebrated big | Today's 30 | Science-skill badges (a 10-minute bird count, a monthly visit) |
| Field guide | One spoken line and a picture | Facts, tracks, "where it lives" | ID features, look-alikes, tracks and scat keys, status |
| Safety | Bramble's tick check as a song-like checklist | Today's tick check | Today's plus the grown-up how-to in their own words |
| Default mode | Together (they can still explore on their own) | On my own | On my own |
| Default look | Bigger text, Bubbly, Lively | Today's default | Plain font, Flat buttons |

## 3. Naming: modes vs. tiers

"Explorer" was also the name of a **mode** (a child alone, as opposed to with a grown-up). **The modes are now
called "On my own" and "Together"** (`tiers.MODE_WORDS`). The stored value is unchanged (`mode: 'explorer' |
'together'`), so only the words changed and no data moved.

## 4. Moving up

- **A grown-up sets the tier** on the explorer's card (behind the grown-up gate). The welcome asks for an
  age band to suggest one. **No birthday or age is stored** — only the tier — because a child's age is
  personal data the app does not need.
- **Scout suggests, never forces.** When an explorer shows they're ready (for example, a Sprout with 25
  finds and 6 badges, or an Explorer who has named 15 species), their guide says so and offers a
  "Try Naturalist?" button that a grown-up confirms. Moving back is always one tap for a grown-up.
- **Moving up is a celebration**: a new badge ("Grew a level!"), the guide's congratulations, and the new
  tools introduced one at a time over the next few outings rather than all at once.

## 5. What each tier needs that does not exist yet

**Sprout**
- A capture flow of three screens (`capture.ts` takes its step list from the tier instead of building it).
- Picture buttons for familiar species. Needs drawings or photos we are allowed to ship — the crew's art
  style could be extended, which avoids licensing third-party photos.
- Targets of at least 72 px, no small text buttons, no typing anywhere (`html[data-tier="sprout"]`).
- Lines written for listening: every bubble short enough to hear in one breath (a third column of
  `buddyLines`).

**Naturalist**
- New, optional fields on `Find`, each asked only at this tier (absence = not asked, so no `DB_VERSION`
  bump): `habitat` (forest · wetland · field · shore · stream · town), `weather` + temperature,
  `measure` (length / height in cm), exact `countN`, `behaviour` (feeding · flying · singing · resting…),
  `confidence` (sure · I think so · not sure).
- A data-sheet view of their own finds (a table) and an export of just their finds.
- Map tools: measure a distance, coordinates, and **study plots** — the same tree, pond or patch visited
  again and again, with every visit's finds side by side (a child-sized monitoring program).
- Science badges and challenges: a 10-minute bird count, one species seen in three seasons, a plot visited
  every month.

**All tiers**
- The field guide (Nova Scotia animals first, then plants and lichens) with **depth by tier**: the same
  species entry carries a Sprout line, Explorer facts and Naturalist ID notes.
- Badges, challenges and hunts tagged by tier, so each tier sees a fitting set.

## 6. Build plan

| Phase | What | Size |
|---|---|---|
| 1 ✅ | `tiers.ts` (pure catalogue of per-tier switches) · `Profile.tier` (absence = Explorer, today's app) · tier picker on the card and in the welcome · modes renamed "On my own" / "Together" | Small |
| 2 | Sprout: three-step capture, `data-tier` CSS for big targets, listening-length lines, picture species buttons (drawings in the crew's style) | Medium + art |
| 3 | Naturalist: the optional field-notebook questions, data sheet, own-finds export (no gate), measure tool | Medium |
| 4 | Field guide with per-tier depth, track and scat keys | Large (content) |
| 5 | Study plots, science badges and challenges, "ready to move up" suggestions | Medium |

Phase 1 changes nothing for anyone already using Scout: every existing explorer reads as an Explorer.

## 7. Decisions

1. **Age bands**: Sprout about 4–6, Explorer about 7–9, Naturalist about 10–12. Agreed.
2. **Sprout is not Together-only.** It starts in Together; a Sprout can still explore on their own.
3. **A Naturalist may export their own finds without a grown-up.** (Every other tier: export stays behind the gate.)
4. **Wording and field-guide content are reviewed by the project owner** before they ship.
5. **Sprout picture buttons are drawings** in the crew's style — no licensed photos.

## 8. Sprout drawings so far

`src/sproutArt.ts` holds them. Each is a drawing in the crew's style that names the list species it stands for,
plus a one-line "how to tell it" for the grown-up. They are already used at every tier: picture buttons first in
the species step, on the find page, and as a find's picture when it has none.

| Drawing | Species | How to tell it |
|---|---|---|
| Red maple leaf | Red Maple | Three big points, small teeth all round, V-shaped gaps; red stalk |
| Sugar maple leaf | Sugar Maple | Five broad points, few big teeth, round U-shaped gaps |

## 9. What Phase 1 built

- `src/tiers.ts`: the catalogue (`TIERS`, `tierOf` — absence reads as Explorer — and `MODE_WORDS`).
- `Profile.tier`, chosen in the welcome ("How old is the explorer?", which also sets the starting mode and
  look) and on the explorer's card (changing it asks for a grown-up). The tier shows on the explorer's card
  and in the Grown-up corner, and is stamped as `data-tier` on `<html>` for the later phases. Changing the tier
  later does not change the explorer's look or mode; those are theirs.
