import { icon } from './icons.ts';
import type { Profile, Sketch } from './types.ts';
import { h, openSheet, askYesNo, toast, uid, whenWords } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { askGrownUp } from './gateView.ts';
import { buddySays } from './buddyView.ts';
import type { MapView } from './mapView.ts';
import { areaKid, areaM2, areaWords, distanceKid, distanceWords, pathLengthM, perimeterM, type LonLat } from './measure.ts';

export type DrawMode = 'sketch' | 'measure';

export interface DrawHost {
  map: MapView;
  profile: Profile;
  sketches: () => Sketch[];
  save: (s: Sketch) => Promise<void>;
  remove: (s: Sketch) => Promise<void>;
}

/** Drawing colours: data on the map, like the find pins, so they are fixed hues rather than theme tokens. */
export const SKETCH_COLOURS = [
  { hex: '#e8590c', label: 'Orange' }, { hex: '#1c7ed6', label: 'Blue' }, { hex: '#2f9e44', label: 'Green' },
  { hex: '#ae3ec9', label: 'Purple' }, { hex: '#f08c00', label: 'Yellow' }, { hex: '#e03131', label: 'Red' },
];
const MEASURE_COLOUR = '#d6336c';

let closeOpen: (() => void) | null = null;

/**
 * ✏️ Draw and 📏 Measure: tap the map to add points, as Field Mapper's MeasurePanel and its sketch tools work
 * (tap-to-place vertices with an undo, a live length and area, and a HUD). Tapping, never dragging, because a
 * finger dragging on a map is how the map pans. One tool at a time; the bottom bar steps aside while it is open.
 * A drawing is saved for the explorer; a measurement is not, unless they keep it as a drawing.
 */
/**
 * `editing`: a saved drawing to change (from its card, shapeCard.ts): it starts with its own dots, shape and colour,
 * Save writes it back under the same id, and the tool closes. Its dots can be dragged, as every drawing's can.
 */
export function openDrawTool(host: DrawHost, mode: DrawMode, onClose: () => void, editing?: Sketch): () => void {
  closeOpen?.();
  let points: LonLat[] = editing ? editing.points.map(p => [p[0], p[1]] as LonLat) : [];
  let kind: Sketch['kind'] = editing?.kind ?? 'line';
  let colour = editing?.colour ?? (mode === 'measure' ? MEASURE_COLOUR : SKETCH_COLOURS[0].hex);
  const asOpened = JSON.stringify({ points, kind, colour });
  const changed = () => JSON.stringify({ points, kind, colour }) !== asOpened;

  const readout = h('div', { class: 'draw-readout', 'aria-live': 'polite' });
  const hint = h('p', { class: 'draw-hint' });
  const kinds = h('span', { class: 'dt-kinds' });
  const colours = h('span', { class: 'dt-colours' });
  const ico = (emoji: string, label: string, onclick: () => void) =>
    h('button', { class: 'draw-ico', type: 'button', 'aria-label': label, title: label, onclick }, emoji);
  const undoBtn = ico('↩️', 'Undo the last point', () => { points.pop(); sounds.tap(); paint(); });
  const clearBtn = ico('🗑️', 'Clear', () => { points = []; sounds.tap(); paint(); });
  const keepBtn = h('button', { class: 'big-btn draw-save', type: 'button', onclick: () => void keep() },
    editing ? '✅ Save changes' : mode === 'measure' ? '✏️ Keep as a drawing' : '✅ Save my drawing');
  const listBtn = mode === 'sketch' && !editing ? ico('📋', 'My drawings', () => openDrawings(host)) : null;

  const paint = () => {
    host.map.setDraft(points, kind, colour);
    kinds.replaceChildren(...(['line', 'area'] as const).map(k => h('button', {
      class: `draw-ico ${kind === k ? 'on' : ''}`, type: 'button', 'aria-pressed': String(kind === k), 'aria-label': k === 'line' ? 'Draw a line' : 'Draw a shape',
      title: k === 'line' ? 'Line' : 'Shape',
      onclick: () => { kind = k; sounds.pick(); say(k === 'line' ? 'A line' : 'A shape'); paint(); },
    }, k === 'line' ? '〰️' : '⬠')));
    colours.replaceChildren(...(mode === 'measure' ? [] : SKETCH_COLOURS).map(c => h('button', {
      class: `draw-swatch ${colour === c.hex ? 'on' : ''}`, type: 'button', style: `--sw:${c.hex}`, 'aria-label': c.label, 'aria-pressed': String(colour === c.hex),
      onclick: () => { colour = c.hex; sounds.tap(); paint(); },
    })));
    const line = kind === 'area' ? perimeterM(points) : pathLengthM(points);
    const area = kind === 'area' ? areaM2(points) : 0;
    readout.replaceChildren(...[
      points.length < 2 ? h('strong', {}, mode === 'measure' ? 'Measure: tap two places' : editing ? 'Change my drawing' : 'Draw on the map')
        : h('strong', {}, `${kind === 'area' ? 'Around: ' : ''}${distanceWords(line)}`, h('span', {}, ` · ${distanceKid(line)}`)),
      area > 0 ? h('strong', {}, `Inside: ${areaWords(area)}`, h('span', {}, ` · ${areaKid(area)}`)) : null,
    ].filter((x): x is HTMLElement => !!x));
    hint.textContent = points.length === 0 ? '👆 Tap the map to add points. Drag to move the map.'
      : kind === 'area' && points.length < 3 ? '👆 A shape needs three points or more.'
      : '✋ Drag a dot to move it. Tap the map to add more.';
    hint.hidden = !hint.textContent;
    undoBtn.toggleAttribute('disabled', !points.length);
    clearBtn.toggleAttribute('disabled', !points.length);
    keepBtn.toggleAttribute('disabled', points.length < (kind === 'area' ? 3 : 2));
  };

  const keep = async () => {
    if (points.length < (kind === 'area' ? 3 : 2)) return;
    if (editing) {
      try {
        await host.save({ ...editing, kind, points: [...points], colour });
        sounds.save();
        say('Changed!');
        toast('✏️ Drawing changed');
        close();
      } catch {
        toast('That change did not save.');
      }
      return;
    }
    const s: Sketch = { id: uid(), profileId: host.profile.id, createdAt: new Date().toISOString(), kind, points: [...points], colour: mode === 'measure' ? SKETCH_COLOURS[1].hex : colour };
    try {
      await host.save(s);
      sounds.save();
      say('Saved on your map!');
      toast('✏️ Saved on your map');
      points = [];
      paint();
    } catch {
      toast('That drawing did not save.');
    }
  };

  const hud = h('section', { class: `draw-hud ${mode}`, role: 'dialog', 'aria-label': mode === 'measure' ? 'Measure' : 'Draw on the map' },
    h('div', { class: 'draw-head' },
      h('strong', {}, mode === 'measure' ? '📏' : '✏️'),
      readout,
      h('button', { class: 'round-btn small', 'aria-label': 'Close', onclick: async () => {
        // Leaving a drawing half-changed asks first; a new drawing's dots go with the tool, as they always have.
        if (editing && changed() && !(await askYesNo('Stop without saving the changes?', '↩️ Yes, stop', '✏️ Keep changing'))) return;
        close();
      } }, icon('close'))),
    hint,
    h('div', { class: 'draw-tools' }, kinds, colours),
    h('div', { class: 'draw-foot' }, keepBtn, undoBtn, clearBtn, listBtn),
  );

  host.map.onToolTap = at => {
    points.push([at.lon, at.lat]);
    sounds.tap();
    paint();
  };
  host.map.onDraftDrag = (i, at) => {
    if (!points[i]) return;
    points[i] = [at.lon, at.lat];
    paint();
  };
  document.body.classList.add('drawing');
  document.body.append(hud);
  paint();
  say(editing ? 'Drag a dot to move it, or tap the map to add more.' : mode === 'measure' ? 'Tap the map to measure how far it is.' : 'Tap the map to draw a line or a shape.');

  function close(): void {
    if (closeOpen !== close) return;
    closeOpen = null;
    host.map.onToolTap = null;
    host.map.onDraftDrag = null;
    host.map.setDraft([], 'line', colour);
    document.body.classList.remove('drawing');
    hud.remove();
    onClose();
  }
  closeOpen = close;
  return close;
}

/** Closes whichever drawing tool is open (when the explorer changes or a screen covers the map). */
export function closeDrawTool(): void {
  closeOpen?.();
}

/** Every drawing of this explorer: show it, or throw it away. */
export function openDrawings(host: DrawHost): void {
  const { body } = openSheet({ title: 'My drawings', emoji: '✏️', className: 'walks' });
  const paint = () => {
    body.replaceChildren();
    const list = host.sketches();
    body.append(buddySays(host.profile.guide, list.length
      ? { text: `You have drawn ${list.length} ${list.length === 1 ? 'thing' : 'things'} on your map!`, pose: 'excited' }
      : { text: 'No drawings yet. Tap the map to draw one!', pose: 'point' }));
    for (const s of list) {
      const what = s.kind === 'area'
        ? `Shape · ${areaWords(areaM2(s.points))} inside`
        : `Line · ${distanceWords(pathLengthM(s.points))}`;
      body.append(h('div', { class: 'maker-row walk-row' },
        h('span', { class: 'draw-dot', style: `--sw:${s.colour}`, 'aria-hidden': 'true' }),
        h('span', { class: 'maker-text' }, h('strong', {}, s.name || what), h('br'), h('span', { class: 'hint' }, whenWords(s.createdAt))),
        h('button', { class: 'round-btn small', 'aria-label': 'Show on map', onclick: () => {
          document.querySelectorAll('.sheet').forEach(x => x.remove());
          host.map.fitLine(s.points);
        } }, '🗺️'),
        h('button', { class: 'round-btn small', 'aria-label': 'Delete this drawing', onclick: async () => {
          const ok = host.profile.mode === 'together'
            ? await askYesNo('Delete this drawing?', '🗑️ Delete', 'Keep')
            : await askGrownUp('Deleting a drawing cannot be undone.');
          if (!ok) return;
          await host.remove(s);
          paint();
        } }, '🗑️')));
    }
  };
  paint();
}
