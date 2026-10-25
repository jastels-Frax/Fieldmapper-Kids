# Changelog

Scout's versions, newest first. The version lives in `package.json`; `src/releaseNotes.ts` carries the same
releases in words for the family (shown as "What's new" on the opening screen), and `test/releaseNotes.test.ts`
holds the three together. **Every release bumps `package.json`, adds an entry here and one in `releaseNotes.ts`.**
Versions before 2.0.0 were numbered when 2.0 started tracking them, from the git history.

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
