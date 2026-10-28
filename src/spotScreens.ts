import type { PhotoSpot, Profile, SpotMedia } from './types.ts';
import { askYesNo, blobUrl, h, openSheet, toast, whenWords } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { askGrownUp } from './gateView.ts';
import { buddySays } from './buddyView.ts';
import { lookingWords, newestShot, shotDays, spotTitle } from './photoSpots.ts';

export interface SpotHost {
  profile: Profile;
  spots: () => PhotoSpot[];
  media: (id: string) => Promise<SpotMedia>;
  /** Saves a spot's details (its name): its pictures stay as they are. */
  saveInfo: (spot: PhotoSpot) => Promise<void>;
  remove: (spot: PhotoSpot) => Promise<void>;
  removePicture: (spot: PhotoSpot, shotId: string) => Promise<void>;
  /** Opens the photo spot card to take this spot again (the tap that calls it may start the compass). */
  takeAgain: (spot: PhotoSpot) => void;
  showOnMap: (spot: PhotoSpot) => void;
}

/** "12 May 2026": the date under a picture, so then and now can be told apart. */
function dateWords(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * One photo spot, large: Field Mapper's photo viewer (`PhotoViewerModal`) for a child. The newest picture, which way
 * it looked, and every earlier picture taken here in a strip ("then and now"); a name; 🔁 Take it again. Deleting
 * a picture or the spot asks a grown-up in "On my own" mode, as every delete does. Exact places only in Together.
 */
export function openSpot(host: SpotHost, id: string, onChange?: () => void): void {
  const spot = host.spots().find(s => s.id === id);
  if (!spot) return;
  const together = host.profile.mode === 'together';
  const { body, close } = openSheet({ title: spotTitle(spot), emoji: '📷', className: 'detail spot-detail' });
  const title = body.parentElement?.querySelector('.sheet-head h1');
  let shown = spot.shots.length - 1;
  let media: SpotMedia | null = null;

  const big = h('img', { class: 'detail-pic spot-big', alt: 'Your picture' });
  if (spot.thumb) big.src = blobUrl(spot.thumb, big);
  const caption = h('p', { class: 'spot-caption' });
  const strip = h('div', { class: 'spot-strip', role: 'group', 'aria-label': 'Every picture taken here' });

  const paint = () => {
    const shot = spot.shots[shown];
    const photo = media?.photos.find(p => p.id === shot.id);
    if (photo) big.src = blobUrl(photo.blob, big);
    big.alt = `Picture ${shown + 1} of ${spot.shots.length}, ${dateWords(shot.takenAt)}`;
    caption.replaceChildren(
      h('strong', {}, dateWords(shot.takenAt)),
      ' · ',
      lookingWords(shot.bearing) ?? 'Way not known');
    strip.hidden = spot.shots.length < 2;
    strip.replaceChildren(...spot.shots.map((s, i) => {
      const p = media?.photos.find(x => x.id === s.id);
      const img = h('img', { alt: '' });
      if (p) img.src = blobUrl(p.blob, img);
      return h('button', { class: `spot-thumb ${i === shown ? 'on' : ''}`, type: 'button', 'aria-pressed': String(i === shown),
        'aria-label': `Picture from ${dateWords(s.takenAt)}`, onclick: () => { shown = i; sounds.tap(); say(dateWords(s.takenAt)); paint(); } },
      img, h('span', {}, new Date(s.takenAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })));
    }));
    delPic.hidden = spot.shots.length < 2;
  };

  const name = h('input', {
    class: 'text-in', maxlength: 40, placeholder: 'Give it a name', 'aria-label': 'Name of this photo spot', value: spot.name ?? '', enterkeyhint: 'done',
  }) as HTMLInputElement;
  name.addEventListener('change', async () => {
    const v = name.value.trim() || undefined;
    if (v === spot.name) return;
    try {
      spot.name = v;
      await host.saveInfo(spot);
      if (title) title.textContent = `📷 ${spotTitle(spot)}`;
      sounds.pick();
      onChange?.();
    } catch {
      toast('That name did not save.');
    }
  });
  name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });

  const facts: HTMLElement[] = [h('li', {}, `🕒 First taken ${whenWords(spot.createdAt).toLowerCase()}`)];
  const days = shotDays(spot);
  if (spot.shots.length > 1) facts.push(h('li', {}, `📷 ${spot.shots.length} pictures${days > 1 ? ` on ${days} different days` : ''}`));
  if (typeof spot.lat === 'number' && typeof spot.lon === 'number') {
    facts.push(h('li', {}, together
      ? `📍 ${spot.lat.toFixed(5)}, ${spot.lon.toFixed(5)}${spot.accuracy ? ` (±${spot.accuracy} m)` : ''}`
      : spot.placeBy === 'map' ? '📍 Where you showed on the map' : '📍 Where you stood'));
  } else {
    facts.push(h('li', {}, '📍 Not on the map: there was no place'));
  }

  const delPic = h('button', { class: 'text-btn danger', onclick: async () => {
    const shot = spot.shots[shown];
    const ok = together
      ? await askYesNo('Delete this picture? It cannot come back.', '🗑️ Delete', 'Keep it')
      : await askGrownUp('Deleting a picture cannot be undone.');
    if (!ok) return;
    try {
      await host.removePicture(spot, shot.id);
      spot.shots = spot.shots.filter(s => s.id !== shot.id);
      shown = Math.min(shown, spot.shots.length - 1);
      toast('🗑️ Picture deleted');
      paint();
      onChange?.();
    } catch {
      toast('That did not delete.');
    }
  } }, '🗑️ Delete this picture');

  const del = h('button', { class: 'text-btn danger', onclick: async () => {
    const ok = together
      ? await askYesNo(`Delete this photo spot and its ${spot.shots.length === 1 ? 'picture' : `${spot.shots.length} pictures`}? They cannot come back.`, '🗑️ Delete', 'Keep it')
      : await askGrownUp('Deleting a photo spot and its pictures cannot be undone.');
    if (!ok) return;
    try {
      await host.remove(spot);
      toast('🗑️ Photo spot deleted');
      close();
      onChange?.();
    } catch {
      toast('That did not delete.');
    }
  } }, '🗑️ Delete this photo spot');

  body.append(big, caption, strip);
  if (spot.shots.length > 1) body.append(h('p', { class: 'hint center' }, '👆 Tap a picture to see how this place looked then.'));
  body.append(
    h('ul', { class: 'detail-facts' }, ...facts),
    name,
    h('div', { class: 'ask-row' },
      h('button', { class: 'big-btn', onclick: () => { close(); host.takeAgain(spot); } }, '🔁 Take it again'),
      typeof spot.lat === 'number' ? h('button', { class: 'big-btn soft', onclick: () => { document.querySelectorAll('.sheet').forEach(x => x.remove()); host.showOnMap(spot); } }, '🗺️ On the map') : null),
    h('p', { class: 'hint center' }, '🌱 Come back in another season and take it again. What changed?'),
    delPic, del,
  );
  paint();
  void host.media(spot.id).then(m => { media = m; paint(); });
  const way = lookingWords(spot.shots[shown].bearing);
  say(`${spotTitle(spot)}.${way ? ` ${way}.` : ''}${spot.shots.length > 1 ? ` You took ${spot.shots.length} pictures here.` : ''}`);
}

/** Every photo spot of this explorer, newest first. */
export function openSpots(host: SpotHost): void {
  const { body } = openSheet({ title: 'My photo spots', emoji: '📷', className: 'walks spot-list' });
  const paint = () => {
    body.replaceChildren();
    const list = host.spots();
    body.append(buddySays(host.profile.guide, list.length
      ? { text: `You have ${list.length} photo ${list.length === 1 ? 'spot' : 'spots'}! Go back one day and take it again.`, pose: 'excited' }
      : { text: 'No photo spots yet. Tap 📷 Photo on the map, point at a view, and take its picture!', pose: 'point' }));
    for (const s of list) {
      const pic = h('span', { class: 'spot-row-pic' });
      if (s.thumb) {
        const img = h('img', { alt: '' });
        img.src = blobUrl(s.thumb, img);
        pic.append(img);
      } else {
        pic.textContent = '📷';
      }
      const newest = newestShot(s);
      const bits = [whenWords(newest?.takenAt ?? s.createdAt), s.shots.length > 1 ? `${s.shots.length} pictures` : '', lookingWords(newest?.bearing) ?? ''].filter(Boolean);
      body.append(h('div', { class: 'maker-row walk-row spot-row' },
        h('button', { class: 'spot-row-open', type: 'button', onclick: () => openSpot(host, s.id, paint) },
          pic, h('span', { class: 'maker-text' }, h('strong', {}, spotTitle(s)), h('br'), h('span', { class: 'hint' }, bits.join(' · ')))),
        typeof s.lat === 'number' ? h('button', { class: 'round-btn small', 'aria-label': 'Show on map', onclick: () => {
          document.querySelectorAll('.sheet').forEach(x => x.remove());
          host.showOnMap(s);
        } }, '🗺️') : null));
    }
  };
  paint();
  say(host.spots().length ? 'Here are your photo spots!' : 'No photo spots yet.');
}
