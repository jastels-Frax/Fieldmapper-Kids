import { buddySvg, BUDDY_NAMES, type Buddy, type Expression } from './buddies.ts';
import type { Line } from './buddyLines.ts';
import { h } from './ui.ts';
import { say } from './speech.ts';

/** Pip or Hop, drawn. The SVG is our own constant markup, never user text. */
export function buddyFigure(b: Buddy, pose: Expression = 'hello', cls = 'buddy-fig'): HTMLElement {
  const el = h('span', { class: cls, role: 'img', 'aria-label': BUDDY_NAMES[b] });
  el.innerHTML = buddySvg(b, pose);
  return el;
}

/** Pip or Hop saying something, inline in a screen. Speaks it too unless `quiet`. */
export function buddySays(b: Buddy, line: Line, opts: { quiet?: boolean; big?: boolean } = {}): HTMLElement {
  if (!opts.quiet) say(line.text);
  return h('div', { class: `buddy-says ${opts.big ? 'big' : ''}` },
    buddyFigure(b, line.pose),
    h('button', { class: 'bubble', onclick: () => say(line.text), 'aria-label': `${BUDDY_NAMES[b]} says: ${line.text}. Tap to hear it again.` },
      h('span', { class: 'bubble-name' }, BUDDY_NAMES[b]),
      h('span', { class: 'bubble-text' }, line.text),
      h('span', { class: 'bubble-say', 'aria-hidden': 'true' }, '🔊'),
    ),
  );
}

/** The buddy who sits on the map: tap for a tip, pops up to cheer. */
export class BuddyDock {
  readonly el: HTMLElement;
  private fig: HTMLElement;
  private bubble: HTMLElement;
  private hideTimer: number | undefined;

  constructor(private buddy: Buddy, private onTap: () => Line) {
    this.fig = buddyFigure(buddy, 'hello', 'buddy-fig dock-fig');
    this.bubble = h('div', { class: 'dock-bubble', hidden: true, role: 'status' });
    this.el = h('button', { class: 'buddy-dock', 'aria-label': `Talk to ${BUDDY_NAMES[buddy]}`, onclick: () => this.speak(this.onTap()) }, this.bubble, this.fig);
  }

  setBuddy(b: Buddy): void {
    this.buddy = b;
    this.el.setAttribute('aria-label', `Talk to ${BUDDY_NAMES[b]}`);
    this.pose('hello');
  }

  pose(p: Expression): void {
    this.fig.innerHTML = buddySvg(this.buddy, p);
  }

  speak(line: Line, ms = 7000): void {
    this.pose(line.pose);
    this.bubble.textContent = line.text;
    this.bubble.hidden = false;
    this.el.classList.remove('hop');
    void this.el.offsetWidth;
    this.el.classList.add('hop');
    say(line.text);
    clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      this.bubble.hidden = true;
      this.pose('hello');
    }, ms);
  }
}
