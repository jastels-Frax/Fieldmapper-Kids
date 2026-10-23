import type { MapView } from './mapView.ts';
import { h } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { lastFix } from './gps.ts';

/**
 * "Tap the map": the screens step aside, a target sits in the middle of the
 * map, and the explorer moves the map (or taps a spot, which slides it under
 * the target) until the target is on their find. Resolves with that point, or
 * null on Cancel. The point is the map's centre, so what is under the target
 * is exactly what is saved.
 */
export function pickOnMap(view: MapView, start?: { lat: number; lon: number }): Promise<{ lat: number; lon: number } | null> {
  return new Promise(resolve => {
    const map = view.map;
    const before = { center: map.getCenter(), zoom: map.getZoom() };
    const here = start ?? (lastFix() ? { lat: lastFix()!.lat, lon: lastFix()!.lon } : null);
    if (here) map.jumpTo({ center: [here.lon, here.lat], zoom: Math.max(map.getZoom(), 17) });
    document.body.classList.add('picking');
    const onClick = (e: { lngLat: { lng: number; lat: number } }) => {
      map.easeTo({ center: [e.lngLat.lng, e.lngLat.lat], duration: 300 });
      sounds.tap();
    };
    map.on('click', onClick);
    const finish = (ok: boolean) => {
      map.off('click', onClick);
      document.body.classList.remove('picking');
      overlay.remove();
      const c = map.getCenter();
      map.jumpTo(before);
      resolve(ok ? { lat: c.lat, lon: c.lng } : null);
    };
    const overlay = h('div', { class: 'picker' },
      h('div', { class: 'picker-target', 'aria-hidden': 'true' }, h('span', {}, '📍')),
      h('div', { class: 'picker-bar top' }, h('p', {}, 'Move the map until the pin is on your find. You can tap a spot too!')),
      h('div', { class: 'picker-bar bottom' },
        h('button', { class: 'big-btn soft', onclick: () => finish(false) }, '✖ Cancel'),
        h('button', { class: 'big-btn', onclick: () => { sounds.pick(); finish(true); } }, '✅ Put it here'),
      ),
    );
    document.body.append(overlay);
    say('Move the map until the pin is on your find. Then tap, put it here.');
  });
}
