import type { Find } from './types.ts';
import { categoryOf, findName } from './categories.ts';
import { kindIcon } from './kindIcon.ts';
import { artFor } from './sproutArt.ts';
import { blobUrl, h } from './ui.ts';

/**
 * A find's picture, small: its photo or drawing (the thumbnail), else the drawing of the species it was named as, else
 * its kind's picture. The sticker book, the celebration and the favourites on a profile card all draw a find this way.
 * `owner` is the element the picture's object URL lives as long as.
 */
export function pictureOf(f: Find, owner: Element, cls: string): HTMLElement {
  const blob = f.thumb;
  const cat = categoryOf(f.category);
  if (blob) {
    const img = h('img', { class: cls, alt: findName(f) });
    img.src = blobUrl(blob, owner);
    return img;
  }
  const art = f.species ? artFor(f.species.name) : undefined;
  if (art) {
    const el = h('span', { class: `${cls} emoji-pic art-pic`, style: `--cat:${cat.colour}`, 'aria-label': art.label });
    el.innerHTML = art.svg();
    return el;
  }
  const el = kindIcon(cat, `${cls} emoji-pic`);
  el.style.setProperty('--cat', cat.colour);
  return el;
}
