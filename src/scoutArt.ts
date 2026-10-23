import type { Expression } from './buddies.ts';
import hello from './assets/journal/scout-hello.webp';
import think from './assets/journal/scout-think.webp';
import excited from './assets/journal/scout-excited.webp';
import point from './assets/journal/scout-point.webp';
import listen from './assets/journal/scout-listen.webp';
import wink from './assets/journal/scout-wink.webp';
import cover from './assets/journal/scout-cover.webp';
import success from './assets/journal/scout-success.webp';

/**
 * Scout the Survey Squirrel, painted: oval portraits cut from the storybook pages (src/assets/journal/scout-*),
 * one per pose the crew's SVGs have, so every place a guide changes pose still changes picture.
 */
const PORTRAITS: Record<Expression, string> = {
  hello,      // clipboard on the stump (Birds)
  think,      // "Look first, listen close"
  excited,    // at the stakeholder meeting
  point,      // the core sample: 238 rings
  listen,     // writing baseline notes
  confused: wink, // the magnifier on the lichens
  wink: cover,    // the cover, smiling
  success,    // winter tracking, notebook out
};

/** Our own constant markup (a fixed asset URL), the one kind of innerHTML this app allows. */
export function scoutHtml(pose: Expression = 'hello'): string {
  return `<img class="scout-img" src="${PORTRAITS[pose] ?? hello}" alt="" draggable="false">`;
}
