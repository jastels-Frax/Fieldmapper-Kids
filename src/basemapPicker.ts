import type { Basemap } from './types.ts';
import { h } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';

const CHOICES: { id: Basemap; emoji: string; label: string; text: string }[] = [
  { id: 'streets', emoji: '🗺️', label: 'Map', text: 'Streets, paths, parks and water' },
  { id: 'satellite', emoji: '🛰️', label: 'Satellite', text: 'Photos taken from space' },
  { id: 'hybrid', emoji: '🌍', label: 'Hybrid', text: 'Satellite photos with roads and names' },
];

/** Three big cards: how the map is drawn. */
export function openBasemapPicker(current: Basemap, pick: (b: Basemap) => void): void {
  const done = () => overlay.remove();
  const overlay = h('div', { class: 'gate-overlay', role: 'dialog', 'aria-label': 'Map style', onclick: (e: Event) => { if (e.target === overlay) done(); } },
    h('div', { class: 'gate-card basemap-card' },
      h('h2', {}, 'How should the map look?'),
      ...CHOICES.map(c => h('button', { class: `mode-card ${current === c.id ? 'on' : ''}`, onclick: () => {
        sounds.pick();
        say(c.label);
        pick(c.id);
        done();
      } }, h('span', { class: 'mode-emoji' }, c.emoji), h('strong', {}, c.label), h('span', {}, c.text))),
      h('button', { class: 'text-btn', onclick: done }, 'Close'),
    ),
  );
  document.body.append(overlay);
}
