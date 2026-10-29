import { kindArt } from './kindArt.ts';
import { h } from './ui.ts';

/**
 * A kind's (or a group's) picture: its drawing where it has one (kindArt.ts: the lichens, moss, a shelf mushroom, a
 * puffball, a coral fungus, a wetland), else its emoji. The drawing is sized in em, so it stands exactly where the emoji stood and
 * every rule that sizes an emoji by its font-size sizes the drawing too. The words beside it name it, so it is hidden
 * from screen readers.
 */
export function kindIcon(k: { emoji: string; art?: string }, cls: string): HTMLSpanElement {
  const el = h('span', { class: cls, 'aria-hidden': 'true' });
  setKindIcon(el, k);
  return el;
}

/** Puts a kind's picture into an element that already exists (a map pin's badge). */
export function setKindIcon(el: HTMLElement, k: { emoji: string; art?: string }): void {
  const art = kindArt(k.art);
  el.classList.add('kind-ic');
  el.classList.toggle('has-art', !!art);
  if (art) el.innerHTML = art;
  else el.textContent = k.emoji;
}
