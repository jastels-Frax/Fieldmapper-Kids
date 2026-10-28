import { h } from './ui.ts';

/**
 * Scout's own icons, drawn for the app rather than borrowed from the emoji font (which draws an arrow differently on
 * every device, and as a blue tile on Windows). One inked line with round ends and a slight hand-drawn bend, in
 * `currentColor`, so each look's ink colours them. Our own constant SVG markup: the one kind of innerHTML this app
 * allows. Each is decorative: the button it sits in carries the words (`aria-label` or its text).
 */
const PATHS = {
  /** ✖ a pencil cross: two strokes, the second a little longer, as drawn by hand. */
  close: '<path d="M6.2 6.4c3.9 3.6 7.6 7.5 11.4 11.3"/><path d="M17.9 5.8C13.8 9.7 10 13.7 6 17.9"/>',
  /** ⬅ a bent shaft and an open head. */
  back: '<path d="M19.5 12.4c-4.6-.5-9.4-.6-14.6-.2"/><path d="M10.6 6.2C8.5 8.3 6.7 10.2 4.8 12.2c2 2 3.9 3.8 6 5.8"/>',
  /** ➡ the same arrow, turned. */
  forward: '<path d="M4.5 11.6c4.6.5 9.4.6 14.6.2"/><path d="M13.4 5.9c2.1 2.1 3.9 4 5.8 6-2 2-3.9 3.8-6 5.9"/>',
  /** 🔊 a little horn and two sound waves. */
  speaker: '<path d="M4.5 9.6h3.2l4.6-3.9v12.6l-4.6-3.9H4.5z"/><path d="M15.4 9.3c1.3 1.6 1.3 3.8 0 5.4"/><path d="M18.1 6.8c2.7 3 2.7 7.4 0 10.4"/>',
  /** ⬆ a straight arrow, turned by its button to point any way (the photo spot's way picker). */
  arrow: '<path d="M12.2 19.8c-.3-4.9-.4-9.8-.1-15.1"/><path d="M6.3 10.3c2-2 3.8-3.8 5.8-5.7 2 2 3.9 3.8 5.9 5.8"/>',
  /** ⌃ a chevron (the rail's fold). */
  up: '<path d="M5.8 15.4c2.1-2.2 4-4.3 6.2-6.4 2 2.1 4 4.2 6.1 6.5"/>',
} as const;

export type IconId = keyof typeof PATHS;
export const ICON_IDS = Object.keys(PATHS) as IconId[];

/** The SVG for one icon, as markup (also read by the test). */
export function iconSvg(id: IconId): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[id]}</svg>`;
}

/** An icon as an element to put in a button. */
export function icon(id: IconId, cls = ''): HTMLElement {
  const el = h('span', { class: `ic ic-${id} ${cls}`.trim(), 'aria-hidden': 'true' });
  el.innerHTML = iconSvg(id);
  return el;
}

/** "Next →" / "← Back": a word with an icon beside it, for a button's contents. */
export function labelled(text: string, id: IconId, side: 'before' | 'after' = 'after'): HTMLElement {
  return side === 'after'
    ? h('span', { class: 'ic-label' }, text, icon(id))
    : h('span', { class: 'ic-label' }, icon(id), text);
}
