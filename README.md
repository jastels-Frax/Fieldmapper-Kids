# Scout 2.0 🧭

A child-friendly (ages 5–10) companion to Fraxinus Field Mapper, for exploring and observing the
world around you. Children find things outside, save them as stickers on a map, and go on
scavenger hunts with their buddy, **Pip the rat** or **Hop the frog**, the same characters as
Field Mapper's guided tour.

It is an offline-capable web app (PWA): open it in a browser on a phone or tablet and use
*Add to Home Screen*.

## What it does

- **Opening screen** (new in 2.0): pick who's exploring, then 🚀 Start adventure — with My finds, Badges, My look,
  My buttons, How to use and the grown-up corner one tap away. Shown when Scout is opened, not every time you come
  back to it.
- **Draw and measure** (new in 2.0): tap the map to draw lines and shapes, or to measure how far (in metres and kid
  steps) and how big (in bedrooms, tennis courts or soccer fields).
- **My buttons** (new in 2.0): each explorer chooses and orders their map buttons; younger explorers start with
  fewer.
- **Storybook pictures** (new in 2.0): characters from the Scout the Survey Squirrel book for your card, and a
  different picture on the map if you like.
- **Map**: a big-button map with "Where am I?" (which also follows you), every find as a pin, and 📸 quick-find
  buttons (off until turned on in My buttons; the kinds you pick, or the kinds you find most): one tap, one photo,
  saved.
- **Photo spots** (📷, new in 2.4): take a picture of a view; the compass remembers which way you looked, and the
  map shows a camera dot with a wedge pointing that way (or tap an arrow yourself). Come back another day and 🔁 take it again to see
  what changed — then and now.
- **"I found something!"**: add as many photos and drawings as you like, pick what it is — a plant, an animal, a
  mushroom, a lichen or a habitat (new in 2.5), then its kind (a fern, a frog, a shelf mushroom, a crusty lichen, a
  wetland…), or ❓ not sure — and ✨ Save now — or go on: name it
  (type your own words, like "little plant", or pick a species), tap its colours, size and how many on one screen,
  and record as many voice notes as you like. It goes where you stood by GPS; you are only asked where when the
  GPS is unsure. Sprouts get three screens: picture, group, save. The celebration goes back to the map by itself.
  Every find can be changed later.
- **Species names** come from the Nova Scotia ACCDC lists in Fraxinus Field Mapper (about 6,400 species,
  with big buttons for familiar ones). Grown-ups can import more lists from Field Mapper or a CSV.
- **Explorers**: several profiles on one device, each with a name, an "about me", a photo or animal
  picture, Explorer or Together mode, their own finds, hunts and badges, and their own guide — any of
  the eight characters, renamed if they like.
- **Map styles**: streets, satellite or hybrid.
- **Which way am I facing?** (🧭): an arrow on the map turns with the device compass (iPhone/iPad ask permission
  once). It reads the phone's own compass, so no data leaves the device.
- **Hold a finger on the map** to save a find right at that spot, as well as with "I found something!".
- **Record my path** (👣): streams GPS into a saved path with live distance and time, can keep the screen
  awake while recording, and keeps every path to see on the map, list and export. The button and the
  paths on the map can each be switched off in the Grown-up corner.
- **My look**: each explorer picks their colours (ten themes, two of them dark, plus **Field Journal** — the default — a
  whole storybook look built from the "Scout the Survey Squirrel" art, where Scout himself becomes the guide), button style (Bubbly, Sticker,
  Flat, Jelly, Outline, Pixel, Pop), background pattern, top strip, map pin shape, celebration (confetti, stars,
  leaves or bubbles), text size, letters and how lively it is, from "Who's exploring?" — or taps "Surprise me!".
- **Reading aloud**: every character speaks in a voice of their own, from the voices built into the device,
  each with their own pitch and pace. A grown-up can switch to one voice for everyone (the best one, or
  any installed voice they pick and preview), Reading aloud is off until a grown-up turns it on in the
  Grown-up corner; tapping a speech bubble always reads it.
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
- **Badges**: 33 badges for exploring, collecting, drawing, telling stories, photo spots and finishing hunts.
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

Everything stays on the device, in the browser's IndexedDB: finds, photos, photo spots, voice notes, locations and
walks. There is no account, no sync and no analytics. The only network use is the map itself: map
pictures come from [OpenFreeMap](https://openfreemap.org) (OpenStreetMap data) and, for satellite and
hybrid, Esri World Imagery; those services see the device's internet address and which part of the map is being
looked at (around the explorer when the map follows them), as any web map does. With no network the map turns plain
green and everything else keeps working; places already viewed are cached.

- **Reading aloud** uses only the voices built into the device. A voice that reads over the internet is never
  chosen automatically; a grown-up can pick one only after a warning.
- **The page** carries a Content-Security-Policy (Scout and the two map services, nothing else; scripts from Scout
  alone) and sends no referrer.
- **The grown-up gate** (hold, then a sum) guards settings, export and every delete in "On my own" mode, removing a
  saved photo or voice note included. A wrong answer gets a new sum; three in a row pause it for a minute.
- **Export** says what the file holds and defaults to rough places (about 100 m, no recorded paths) for sharing.
- **Hosting**: anything else published on the same web address (`<user>.github.io`) can read Scout's stored data.
  Serve Scout from its own domain or subdomain if anything else is published there.

## Versions

Scout is at **2.4.3**. See [CHANGELOG.md](CHANGELOG.md); the app shows What's new on its opening screen.

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
