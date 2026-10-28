import { icon } from './icons.ts';
import type { Profile, Sketch } from './types.ts';
import { askYesNo, h, toast, whenWords } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { askGrownUp } from './gateView.ts';
import type { MapView } from './mapView.ts';
import { sketchFacts, sketchGeometry, walkFacts, walkGeometry, type Picked } from './mapShapes.ts';
import type { Walk } from './walk.ts';

export interface ShapeCardHost {
  map: MapView;
  profile: Profile;
  saveSketch: (s: Sketch) => Promise<void>;
  removeSketch: (s: Sketch) => Promise<void>;
  saveWalk: (w: Walk) => Promise<void>;
  removeWalk: (w: Walk) => Promise<void>;
  /** Open ✏️ Draw on this drawing, to move its dots, add to it or change its colour. */
  editSketch: (s: Sketch) => void;
}

let closeOpen: (() => void) | null = null;

/**
 * A tapped drawing or path: what it is, how long or big, when, a name, and what can be done with it. Field
 * Mapper's Identify popup with its edit commands (`ui/editCommandBar.ts`), as one short card at the foot of the map
 * in place of the bottom bar, like the drawing tool. A drawing can be changed (its dots moved, added to, recoloured)
 * and named; a recorded path can be named but not reshaped, because it is a record of where the explorer really
 * walked. Deleting either asks a grown-up in "On my own" mode, as the lists of drawings and paths do.
 */
export function openShapeCard(host: ShapeCardHost, picked: Picked): void {
  closeShapeCard();
  const sketch = picked.kind === 'sketch' ? picked.sketch : null;
  const walk = picked.kind === 'walk' ? picked.walk : null;
  const what = sketch ? (sketch.kind === 'area' ? 'shape' : 'line') : 'path';
  const facts = sketch ? sketchFacts(sketch) : walkFacts(walk!);
  const when = whenWords(sketch ? sketch.createdAt : walk!.startedAt);

  const title = h('strong', { class: 'shape-title' }, facts.title);
  const name = h('input', {
    class: 'text-in', maxlength: 40, placeholder: `Give your ${what} a name`, 'aria-label': `Name of this ${what}`,
    value: (sketch?.name ?? walk?.name) ?? '', enterkeyhint: 'done',
  }) as HTMLInputElement;
  // The name is kept as it is typed (on leaving the box or pressing Done): no separate Save to forget.
  const saveName = async () => {
    const v = name.value.trim() || undefined;
    if (v === (sketch?.name ?? walk?.name)) return;
    try {
      if (sketch) await host.saveSketch({ ...sketch, name: v });
      else await host.saveWalk({ ...walk!, name: v });
      if (sketch) sketch.name = v; else walk!.name = v;
      title.textContent = v ?? (sketch ? sketchFacts({ ...sketch, name: undefined }).title : 'My path');
      sounds.pick();
    } catch {
      toast('That name did not save.');
    }
  };
  name.addEventListener('change', () => void saveName());
  name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });

  const remove = async () => {
    const ok = host.profile.mode === 'together'
      ? await askYesNo(`Delete this ${what}?`, '🗑️ Delete', 'Keep')
      : await askGrownUp(`Deleting a ${what} cannot be undone.`);
    if (!ok) return;
    try {
      if (sketch) await host.removeSketch(sketch); else await host.removeWalk(walk!);
      sounds.tap();
      toast(`🗑️ ${what[0].toUpperCase()}${what.slice(1)} deleted`);
      close();
    } catch {
      toast('That did not delete.');
    }
  };

  const geometry = sketch ? sketchGeometry(sketch) : walkGeometry(walk!);
  const coords = sketch ? sketch.points : walk!.points.map(p => [p.lon, p.lat] as [number, number]);
  const card = h('section', { class: 'draw-hud shape-card', role: 'dialog', 'aria-label': facts.title },
    h('div', { class: 'draw-head' },
      sketch ? h('span', { class: 'draw-dot', style: `--sw:${sketch.colour}`, 'aria-hidden': 'true' }) : h('strong', { 'aria-hidden': 'true' }, facts.emoji),
      h('span', { class: 'draw-readout' }, title, h('span', {}, `${what === 'path' ? 'Walked' : 'Drawn'} ${when.toLowerCase()}`)),
      h('button', { class: 'round-btn small', 'aria-label': 'See all of it', title: 'See all of it', onclick: () => { sounds.tap(); host.map.fitLine(coords); } }, '🔍'),
      h('button', { class: 'round-btn small', 'aria-label': 'Close', onclick: () => close() }, icon('close'))),
    h('div', { class: 'shape-facts' }, ...facts.facts.map(f => h('p', {}, f))),
    name,
    h('div', { class: 'draw-foot' },
      sketch
        ? h('button', { class: 'big-btn', type: 'button', onclick: () => { close(); host.editSketch(sketch); } }, '✏️ Change it')
        : h('p', { class: 'hint shape-note' }, '👣 A path shows where you really walked, so it stays as it is.'),
      h('button', { class: 'big-btn soft shape-delete', type: 'button', onclick: () => void remove() }, '🗑️ Delete')),
  );

  host.map.setPicked(geometry);
  document.body.classList.add('shape-open');
  document.body.append(card);
  sounds.tap();
  say(`${facts.title}. ${facts.facts[0]}.`);

  function close(): void {
    if (closeOpen !== close) return;
    closeOpen = null;
    // A name typed and not yet left is kept, not lost with the card.
    if (document.activeElement === name) void saveName();
    host.map.setPicked(null);
    document.body.classList.remove('shape-open');
    card.remove();
  }
  closeOpen = close;
}

/** Closes the card if one is open (a tap on empty map, another tool, another explorer). */
export function closeShapeCard(): void {
  closeOpen?.();
}

export function shapeCardOpen(): boolean {
  return !!closeOpen;
}
