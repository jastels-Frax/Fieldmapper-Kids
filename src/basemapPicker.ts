import type { Basemap, PinSize } from './types.ts';
import { h } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';

const CHOICES: { id: Basemap; emoji: string; label: string; text: string }[] = [
  { id: 'streets', emoji: '🗺️', label: 'Map', text: 'Streets, paths, parks and water' },
  { id: 'satellite', emoji: '🛰️', label: 'Satellite', text: 'Photos taken from space' },
  { id: 'hybrid', emoji: '🌍', label: 'Hybrid', text: 'Satellite photos with roads and names' },
];

/** A switch on the Map card: its state is read again after every tap, from the app that owns it. */
export interface MapSwitch {
  emoji: string;
  label: string;
  text: () => string;
  on: () => boolean;
  toggle: () => Promise<void>;
}

/**
 * The 🗺️ Map card: how the map looks (three big cards), how big the pins are, and the map's switches (the facing
 * arrow, keeping the screen on, everyone's finds). Field Mapper keeps these as separate rail buttons beside a Basemaps sheet; a phone held by a child has room
 * for far fewer buttons, so the ones a child sets once and leaves live here.
 */
/** The three pin sizes, each shown as a pin of that size (a child picks by looking, not by reading). */
const PIN_SIZES: { id: PinSize; label: string; px: number }[] = [
  { id: 'small', label: 'Small', px: 20 }, { id: 'medium', label: 'Medium', px: 28 }, { id: 'large', label: 'Big', px: 38 },
];

/** The Map card's "Size of pins": read again after every tap, from the app that owns it. */
export interface PinSizeChoice {
  now: () => PinSize;
  pick: (s: PinSize) => Promise<void>;
}

export function openMapSheet(current: Basemap, pick: (b: Basemap) => void, switches: MapSwitch[] = [], sizes?: PinSizeChoice): void {
  let now = current;
  const done = () => overlay.remove();
  const styles = h('div', { class: 'choice-grid three map-styles' });
  const toggles = h('div', { class: 'map-switches' });
  const sizeRow = h('div', { class: 'choice-grid three pin-sizes' });
  const paint = () => {
    if (sizes) sizeRow.replaceChildren(...PIN_SIZES.map(z => h('button', {
      class: `choice style-choice ${sizes.now() === z.id ? 'on' : ''}`, 'aria-pressed': String(sizes.now() === z.id), 'aria-label': `${z.label} pins`,
      onclick: async () => { sounds.pick(); say(`${z.label} pins`); await sizes.pick(z.id); paint(); },
    }, h('span', { class: 'pin-size-sample', style: `font-size:${z.px}px` }, '📍'), z.label)));
    styles.replaceChildren(...CHOICES.map(c => h('button', {
      class: `choice style-choice ${now === c.id ? 'on' : ''}`, 'aria-pressed': String(now === c.id), 'aria-label': `${c.label}: ${c.text}`,
      onclick: () => { sounds.pick(); say(c.label); now = c.id; pick(c.id); paint(); },
    }, h('span', { class: 'choice-emoji' }, c.emoji), c.label)));
    toggles.replaceChildren(...switches.map(s => h('button', {
      class: `edit-row switch-row ${s.on() ? 'on' : ''}`, 'aria-pressed': String(s.on()),
      onclick: async () => { await s.toggle(); paint(); },
    }, h('span', { class: 'switch-emoji' }, s.emoji),
      h('span', { class: 'switch-text' }, h('strong', {}, s.label), h('small', {}, s.text())),
      h('span', { class: 'switch-word' }, s.on() ? 'On' : 'Off'))));
  };
  paint();
  const overlay = h('div', { class: 'gate-overlay', role: 'dialog', 'aria-label': 'Map', onclick: (e: Event) => { if (e.target === overlay) done(); } },
    h('div', { class: 'gate-card basemap-card map-card' },
      h('h2', {}, '🗺️ How should the map look?'),
      styles,
      ...(sizes ? [h('h2', {}, '📍 Size of pins'), sizeRow] : []),
      ...(switches.length ? [h('h2', {}, '🔧 Map helpers'), toggles] : []),
      h('button', { class: 'big-btn', onclick: done }, '✅ Done'),
    ),
  );
  document.body.append(overlay);
}
