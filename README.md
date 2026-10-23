# Scout 🧭

A child-friendly (ages 5–10) companion to Fraxinus Field Mapper, for exploring and observing the
world around you. Children find things outside, save them as stickers on a map, and go on
scavenger hunts with their buddy, **Pip the rat** or **Hop the frog**, the same characters as
Field Mapper's guided tour.

It is an offline-capable web app (PWA): open it in a browser on a phone or tablet and use
*Add to Home Screen*.

## What it does

- **Map**: a big-button map with "Where am I?", every find as a pin, and a dotted trail of today's walk.
- **"I found something!"**: add as many photos and drawings as you like, pick what it is (bird, bug, plant,
  tree, flower, animal, tracks & scat, rock, water, sky, mystery), name the species if you know it, tap its
  colours, say how big it is and how many there were, choose where it goes (where you stood by GPS, a spot
  tapped on the map, or nowhere), and record a voice note. Your guide asks each question out loud.
  Every find can be changed later.
- **Species names** come from the Nova Scotia ACCDC lists in Fraxinus Field Mapper (about 6,400 species,
  with big buttons for familiar ones). Grown-ups can import more lists from Field Mapper or a CSV.
- **Explorers**: several profiles on one device, each with a name, an "about me", a photo or animal
  picture, Explorer or Together mode, their own finds, hunts and badges, and their own guide — any of
  the eight characters, renamed if they like.
- **Map styles**: streets, satellite or hybrid.
- **Record my path** (👣): streams GPS into a saved path with live distance and time, can keep the screen
  awake while recording, and keeps every path to see on the map, list and export. The button and the
  paths on the map can each be switched off in the Grown-up corner.
- **My look**: each explorer picks their colours (ten themes, two of them dark), button style (Bubbly, Sticker,
  Flat, Jelly, Outline, Pixel, Pop), background pattern, top strip, map pin shape, celebration (confetti, stars,
  leaves or bubbles), text size, letters and how lively it is, from "Who's exploring?" — or taps "Surprise me!".
- **Reading aloud** uses the best voice the device has (a grown-up can pick and preview any installed
  voice), and the 🔊 / 🔇 button on the map turns it on and off.
- **Sticker book**: every find as a sticker, filtered by kind, with favourites.
- **Scavenger hunts**: eight ready-made hunts (Backyard, Rainbow, Forest, Pond & Stream, Tiny Things,
  Five Senses, Beach, Flower). A find ticks the items it matches; the explorer can tick others
  ("a feather") by saying it counts. Finished hunts go on a trophy shelf. Grown-ups can make their own hunts.
- **Daily challenges**: three new ones every day, the same on every device.
- **The woodland crew**: Fern the fox runs the hunts, Maple the moose keeps the badges, Bramble the
  bear is the safety ranger, Hoot the owl shares facts, Acorn the squirrel keeps the sticker book and
  Bandit the raccoon hides the daily challenges. Tap the name at the top of the map to meet them.
- **Tick check**: when a hunt ends, or any time from 🏠 on the map, Bramble walks the explorer through
  the places ticks hide, with a grown-ups' guide to checking and removing a tick.
- **Badges**: 30 badges for exploring, collecting, drawing, telling stories and finishing hunts.
- **Age levels**: 🌱 Sprout (about 4–6), 🧭 Explorer (about 7–9), 🔬 Naturalist (about 10–12), chosen by a grown-up.
  Today they set the starting look and mode; what each level asks and offers is planned in `docs/AGE_TIERS.md`.
- **On my own or Together**, chosen on first launch and switched any time with the 🧒 / 👨‍👧 button on the map
  (switching to Together asks for a grown-up):
  - *On my own*: a child exploring alone. Big pictures, everything read aloud, no typing; deleting
    finds and settings need a grown-up.
  - *Together*: a child and a grown-up side by side. Adds questions to talk about, a name and a
    note for each find, and exact coordinates.
- **Grown-up corner** (🔒, press and hold, then a multiplication question): mode, name, buddy,
  sounds, read-aloud, the walk trail, **export every find as a zip** (GeoJSON + CSV + photos, drawings,
  voices), and delete everything.

## Privacy

Everything stays on the device, in the browser's IndexedDB: finds, photos, voice notes, locations and
walks. There is no account, no sync and no analytics. The only network use is the map itself: map
pictures come from [OpenFreeMap](https://openfreemap.org) (OpenStreetMap data) and, for satellite and
hybrid, Esri World Imagery; those services see which part of the map is being looked at, as any web map does. With no network the map turns plain green and
everything else keeps working; places already viewed are cached.

## Development

```bash
npm install
npm run dev       # Vite dev server
npm test          # node:test suites over the pure modules (Node 22+)
npm run build     # tsc typecheck + vite build -> dist/
npm run preview   # serve dist/
```

See `CLAUDE.md` for the architecture.

## Deploy

`.github/workflows/ci.yml` tests and builds on every push. `.github/workflows/pages.yml` builds and
publishes `dist/` to GitHub Pages on every push to `main`. In **Settings ▸ Pages**, the source must be
**GitHub Actions**: "Deploy from a branch" serves the unbuilt source, which shows a white screen.
The build uses relative URLs, so it works on any subpath.
