import { icon } from './icons.ts';
import type { PhotoSpot, Profile, SpotMedia, SpotShot } from './types.ts';
import { askYesNo, blobUrl, h, toast, uid } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { downscale } from './image.ts';
import { accuracyWords, knownFix, steadiedFix, steadyNow } from './gps.ts';
import { distanceM } from './geo.ts';
import type { MapView } from './mapView.ts';
import { compassWord } from './heading.ts';
import { ARROWS, backAtSpotWords, lookingWords, nearestArrow, spotBearing, spotTitle, storedBearing } from './photoSpots.ts';

export interface SpotToolHost {
  map: MapView;
  profile: Profile;
  /** The live compass heading in degrees, or null while there is none. */
  heading: () => number | null;
  /** Tap the map to choose a spot (mapPicker.ts). */
  pickOnMap: (start?: { lat: number; lon: number }) => Promise<{ lat: number; lon: number } | null>;
  /** Saves a new spot with its first picture. */
  saveNew: (spot: PhotoSpot, media: SpotMedia) => Promise<void>;
  /** Adds a picture to a spot that is being taken again. */
  addPicture: (spot: PhotoSpot, shot: SpotShot, blob: Blob) => Promise<void>;
  /** "My photo spots". */
  openList: () => void;
}

/** Taking a spot again: the spot, and its newest picture to stand in the same place by. */
export interface TakeAgain {
  spot: PhotoSpot;
  last?: Blob;
}

let closeOpen: (() => void) | null = null;

/**
 * 📷 Photo spots: Field Mapper's Add Photo Point panel (`photos/PhotoCapturePanel.ts`) for a child, as one short card
 * at the foot of the map like ✏️ Draw. Field Mapper's panel takes the camera bearing from the live compass
 * (`deviceorientationabsolute`, falling back to `deviceorientation`; iOS asks permission) and lets the surveyor
 * slide it or type degrees; here the way is the compass reading AT THE TAP that opens the camera (the moment the
 * tablet is pointed at the view), shown as an arrow, and a child fixes it by tapping one of eight arrows, or "not
 * sure" — which keeps it blank, never north. The place is the steadied fix taken at that same tap (Field Mapper's
 * live GPS fix), or a spot tapped on the map; never the photo's own EXIF location (Scout reads none). One button,
 * the camera: on a computer the same button opens the files.
 *
 * `again`: take a saved spot again (then and now) — it shows the last picture and how far away the spot is, and
 * the new picture joins the spot where it is, never moving it.
 */
export function openSpotTool(host: SpotToolHost, onClose: () => void, again?: TakeAgain): () => void {
  closeOpen?.();
  const hud = h('section', { class: 'draw-hud spot-hud', role: 'dialog', 'aria-label': again ? 'Take a photo spot again' : 'Photo spot' });
  const lastWay = again ? spotBearing(again.spot) : undefined;
  let ticker: number | undefined;

  // ── Step 1: point and take ────────────────────────────────────
  const aim = () => {
    clearInterval(ticker);
    hud.classList.remove('saving');
    host.map.setSpotDraft(null);
    const way = h('span', { 'aria-live': 'polite' });
    const where = h('p', { class: 'draw-hint spot-where', hidden: true });
    const tick = () => {
      const deg = host.heading();
      way.textContent = deg != null ? `🧭 ${lookingWords(deg)}` : again && lastWay != null ? `Look ${compassWord(lastWay)}, like last time` : 'Point at what you want to remember';
      if (again && typeof again.spot.lat === 'number') {
        const me = knownFix();
        where.hidden = !me;
        if (me) {
          const w = backAtSpotWords(distanceM(me.lat, me.lon, again.spot.lat, again.spot.lon!), me.accuracy);
          where.textContent = `${w.here ? '✅' : '📍'} ${w.text}`;
          where.classList.toggle('here', w.here);
        }
      }
    };
    const ghost = again?.last ? h('img', { class: 'spot-ghost', alt: 'Your picture from last time' }) : null;
    if (ghost) queueMicrotask(() => { ghost.src = blobUrl(again!.last!, ghost); });
    hud.replaceChildren(
      h('div', { class: 'draw-head' },
        h('strong', { 'aria-hidden': 'true' }, '📷'),
        h('span', { class: 'draw-readout' }, h('strong', {}, again ? `Again: ${spotTitle(again.spot)}` : 'Photo spot'), way),
        h('button', { class: 'round-btn small', 'aria-label': 'Close', onclick: () => close() }, icon('close'))),
      again
        ? h('div', { class: 'spot-again' }, ghost,
          h('p', { class: 'draw-hint' }, lastWay != null
            ? `Stand where you stood last time, look ${compassWord(lastWay)}, and take the same picture. What changed?`
            : 'Stand where you stood last time and take the same picture. What changed?'))
        : h('p', { class: 'draw-hint' }, 'Stand still, point your tablet at a view you want to remember, and take its picture. Your map will show which way you looked.'),
      where,
      h('div', { class: 'draw-foot' },
        h('button', { class: 'big-btn spot-take', type: 'button', onclick: () => take() }, '📷 Take the picture'),
        again ? null : h('button', { class: 'draw-ico', type: 'button', 'aria-label': 'My photo spots', title: 'My photo spots', onclick: () => host.openList() }, '📋')),
    );
    tick();
    ticker = window.setInterval(tick, 400);
  };

  /** The camera must open inside the tap, or a phone refuses it; the way and the place are read at the tap too. */
  const take = () => {
    sounds.tap();
    const deg = host.heading();
    const atTap = steadyNow();
    const settled = atTap?.unsettled ? steadiedFix() : Promise.resolve(atTap);
    const input = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true }) as HTMLInputElement;
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;
      try {
        const blob = await downscale(file, 1600);
        const thumb = await downscale(blob, 240, 0.8).catch(() => undefined);
        const fix = again ? null : ((await settled) ?? atTap);
        // The compass at the tap; taking it again without one keeps last time's way, which is what was asked for.
        const bearing = deg != null ? storedBearing(deg) : again ? lastWay : undefined;
        save({ blob, thumb, bearing, facingBy: deg != null ? 'compass' : bearing != null ? 'chosen' : undefined,
          place: fix ? { lat: fix.lat, lon: fix.lon, accuracy: Math.round(fix.accuracy), by: 'gps' } : null });
      } catch {
        sounds.oops();
        toast('Oh no, that picture did not work. Try again?');
      }
    });
    document.body.append(input);
    input.click();
  };

  // ── Step 2: which way, a name, where, save ────────────────────
  interface Draft {
    blob: Blob;
    thumb?: Blob;
    bearing?: number;
    facingBy?: SpotShot['facingBy'];
    place: { lat: number; lon: number; accuracy?: number; by: 'gps' | 'map' } | null;
    name?: string;
  }
  const save = (d: Draft) => {
    clearInterval(ticker);
    hud.classList.add('saving');
    const at = () => (again && typeof again.spot.lat === 'number' ? { lat: again.spot.lat, lon: again.spot.lon! } : d.place);
    const pic = h('img', { class: 'spot-shot', alt: 'Your picture' });
    queueMicrotask(() => { pic.src = blobUrl(d.thumb ?? d.blob, pic); });
    const way = h('p', { class: 'spot-way', 'aria-live': 'polite' });
    const grid = h('div', { class: 'spot-arrows', role: 'group', 'aria-label': 'Which way were you looking?' });
    const placeLine = h('div', { class: 'spot-place' });
    const name = again ? null : h('input', {
      class: 'text-in', maxlength: 40, placeholder: 'Give it a name (you can skip this)', 'aria-label': 'Name of this photo spot',
      value: d.name ?? '', enterkeyhint: 'done',
    }) as HTMLInputElement;
    name?.addEventListener('input', () => { d.name = name.value; });
    name?.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });

    const paint = () => {
      const lit = d.bearing != null ? nearestArrow(d.bearing) : null;
      // 3 × 3, as the arrows point on the map (north up); the middle is "not sure".
      const order: (number | null)[] = [315, 0, 45, 270, null, 90, 225, 180, 135];
      grid.replaceChildren(...order.map(deg => {
        if (deg == null) {
          return h('button', { class: `spot-arrow unsure ${d.bearing == null ? 'on' : ''}`, type: 'button', 'aria-pressed': String(d.bearing == null),
            'aria-label': 'Not sure which way', onclick: () => { d.bearing = undefined; d.facingBy = undefined; sounds.pick(); say('Not sure. That is OK!'); paint(); } }, '?');
        }
        const word = ARROWS.find(a => a.deg === deg)!.word;
        const b = h('button', { class: `spot-arrow ${lit === deg ? 'on' : ''}`, type: 'button', 'aria-pressed': String(lit === deg), 'aria-label': word,
          style: `--rot:${deg}deg`, onclick: () => { d.bearing = deg; d.facingBy = 'chosen'; sounds.pick(); say(`Looking ${word}`); paint(); } }, icon('arrow'));
        return b;
      }));
      way.textContent = d.bearing != null
        ? `${lookingWords(d.bearing)}${d.facingBy === 'compass' ? ' (from the compass)' : ''}`
        : 'Tap an arrow, or ? if you are not sure.';
      const p = at();
      if (again) {
        placeLine.replaceChildren(h('span', {}, '📍 It joins your pictures at this spot.'));
      } else if (!d.place) {
        placeLine.replaceChildren(h('span', {}, '📍 I could not find where you are.'),
          h('button', { class: 'chip', type: 'button', onclick: () => void choosePlace() }, '👆 Show me on the map'));
      } else {
        const pl = d.place;
        placeLine.replaceChildren(
          h('span', {}, pl.by === 'map' ? '📍 Where you tapped on the map' : `📍 Where you are standing${pl.accuracy != null ? ` (${accuracyWords(pl.accuracy).text.toLowerCase()})` : ''}`),
          h('button', { class: 'chip', type: 'button', onclick: () => void choosePlace() }, '✏️ Change'));
      }
      host.map.setSpotDraft(p, d.bearing, d.thumb);
    };

    const choosePlace = async () => {
      sounds.tap();
      say('Move the map so the target is where you were standing.');
      hud.hidden = true;
      const chosen = await host.pickOnMap(d.place ?? undefined);
      hud.hidden = false;
      if (chosen) d.place = { ...chosen, by: 'map' };
      paint();
    };

    const keep = async () => {
      saveBtn.setAttribute('disabled', '');
      const now = new Date().toISOString();
      const shot: SpotShot = { id: uid(), takenAt: now, ...(d.bearing != null ? { bearing: d.bearing, facingBy: d.facingBy ?? 'chosen' } : {}) };
      try {
        if (again) {
          await host.addPicture(again.spot, shot, d.blob);
          close();
          return;
        }
        const p = d.place;
        const spot: PhotoSpot = {
          id: uid(), profileId: host.profile.id, createdAt: now, shots: [shot],
          ...(d.name?.trim() ? { name: d.name.trim() } : {}),
          ...(d.thumb ? { thumb: d.thumb } : {}),
          ...(p ? { lat: p.lat, lon: p.lon, placeBy: p.by, ...(p.by === 'gps' && p.accuracy != null ? { accuracy: p.accuracy } : {}) } : {}),
        };
        await host.saveNew(spot, { photos: [{ id: shot.id, blob: d.blob }] });
        sounds.save();
        say(p ? (d.bearing != null ? 'Saved! Your map shows which way you looked.' : 'Saved on your map!') : 'Saved! It is in My photo spots.');
        toast('📷 Photo spot saved!');
        aim();
        if (p) requestAnimationFrame(() => host.map.showAbove(p.lat, p.lon, hud.offsetHeight));
      } catch {
        saveBtn.removeAttribute('disabled');
        toast('That photo spot did not save. Try again?');
      }
    };
    const saveBtn = h('button', { class: 'big-btn draw-save', type: 'button', onclick: () => void keep() }, again ? '✅ Add this picture' : '✅ Save');

    hud.replaceChildren(
      h('div', { class: 'draw-head' },
        h('strong', { 'aria-hidden': 'true' }, '📷'),
        h('span', { class: 'draw-readout' }, h('strong', {}, again ? 'Then and now!' : 'Which way were you looking?'), h('span', {}, again ? 'Check the way, then add it.' : 'The beam on the map points that way.')),
        h('button', { class: 'round-btn small', 'aria-label': 'Close', onclick: async () => {
          if (await askYesNo('Stop without saving this picture?', '🗑️ Yes, stop', '📷 Keep it')) close();
        } }, icon('close'))),
      h('div', { class: 'spot-pick' }, pic, grid),
      way,
      ...(name ? [name] : []),
      placeLine,
      h('div', { class: 'draw-foot' },
        saveBtn,
        h('button', { class: 'draw-ico', type: 'button', 'aria-label': 'Take the picture again', title: 'Take it again', onclick: () => take() }, '🔄')),
    );
    paint();
    // The spot in the middle of the map that the card leaves showing, so its beam can be seen turning.
    const p = at();
    if (p) requestAnimationFrame(() => host.map.showAbove(p.lat, p.lon, hud.offsetHeight));
    say(d.bearing != null ? `${lookingWords(d.bearing)}. Is that right? Tap an arrow to change it.` : 'Which way were you looking? Tap an arrow.');
  };

  document.body.classList.add('drawing');
  document.body.append(hud);
  aim();
  if (again && typeof again.spot.lat === 'number') requestAnimationFrame(() => host.map.showAbove(again.spot.lat!, again.spot.lon!, hud.offsetHeight));
  say(again ? 'Go back to the spot and take the same picture again!' : 'Point at a view you want to remember, then take its picture.');

  function close(): void {
    if (closeOpen !== close) return;
    closeOpen = null;
    clearInterval(ticker);
    host.map.setSpotDraft(null);
    document.body.classList.remove('drawing');
    hud.remove();
    onClose();
  }
  closeOpen = close;
  return close;
}

/** Closes the photo spot card if it is open (another tool, another explorer, a screen over the map). */
export function closeSpotTool(): void {
  closeOpen?.();
}

export function spotToolOpen(): boolean {
  return !!closeOpen;
}
