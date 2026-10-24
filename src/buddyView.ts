import type { Expression } from './buddies.ts';
import type { Line } from './buddyLines.ts';
import type { GuideId } from './types.ts';
import { h } from './ui.ts';
import { say } from './speech.ts';
import { critterSvg, type Critter } from './critters.ts';
import { CAST } from './cast.ts';
import { GUIDE_INFO, activeGuide, guideSvg } from './guides.ts';
import { scoutHtml } from './scoutArt.ts';

const figureHtml = (g: GuideId, pose: Expression) => (g === 'scout' ? scoutHtml(pose) : guideSvg(g, pose));

/**
 * The explorer may rename their guide ("Mr Whiskers"), and the guide may be one
 * of the crew, so every place a character is named asks here.
 */
let renamed: Partial<Record<GuideId, string>> = {};

export function setGuideName(g: GuideId, name: string): void {
  renamed = { [g]: name };
}

export function nameOf(g: GuideId): string {
  return renamed[g] ?? GUIDE_INFO[g].name;
}

/** Any character, drawn. The SVG is our own constant markup, never user text. */
export function guideFigure(g: GuideId, pose: Expression = 'hello', cls = 'buddy-fig'): HTMLElement {
  const label = g === 'scout' ? nameOf(g) : `${nameOf(g)} the ${GUIDE_INFO[g].species}`;
  const el = h('span', { class: `${cls} ${g === 'scout' ? 'scout' : ''}`, role: 'img', 'aria-label': label });
  el.innerHTML = figureHtml(g, pose);
  return el;
}

export const critterFigure = (c: Critter, pose: Expression = 'hello', cls = 'buddy-fig') => guideFigure(c, pose, cls);

function says(g: GuideId, label: string, line: Line, opts: { quiet?: boolean; big?: boolean }, crew: boolean): HTMLElement {
  if (!opts.quiet) say(line.text, g);
  return h('div', { class: `buddy-says ${crew ? 'crew' : ''} ${opts.big ? 'big' : ''}` },
    guideFigure(g, line.pose),
    h('button', { class: 'bubble', onclick: () => say(line.text, g), 'aria-label': `${nameOf(g)} says: ${line.text}. Tap to hear it again.` },
      h('span', { class: 'bubble-name' }, label),
      h('span', { class: 'bubble-text' }, line.text),
      h('span', { class: 'bubble-say', 'aria-hidden': 'true' }, '🔊'),
    ),
  );
}

/** The explorer's own guide saying something. Speaks it too unless `quiet`. */
export function buddySays(g: GuideId, line: Line, opts: { quiet?: boolean; big?: boolean } = {}): HTMLElement {
  const a = activeGuide(g);
  return says(a, nameOf(a), line, opts, false);
}

/** A crew member in their job (Fern on the hunts…). */
export function crewSays(c: Critter, line: Line, opts: { quiet?: boolean; big?: boolean } = {}): HTMLElement {
  return says(c, `${nameOf(c)} · ${CAST[c].role}`, line, opts, true);
}

/** The guide who sits on the map: tap for a tip, pops up to cheer. */
export class BuddyDock {
  readonly el: HTMLElement;
  private fig: HTMLElement;
  private bubble: HTMLElement;
  private hideTimer: number | undefined;

  constructor(private guide: GuideId, private onTap: () => Line) {
    this.fig = guideFigure(guide, 'hello', 'buddy-fig dock-fig');
    this.bubble = h('div', { class: 'dock-bubble', hidden: true, role: 'status' });
    this.el = h('button', { class: 'buddy-dock', 'aria-label': `Talk to ${nameOf(activeGuide(guide))}`, onclick: () => this.speak(this.onTap()) }, this.bubble, this.fig);
    // The look can bring Scout in or take him away while the dock sits on the map.
    window.addEventListener('look-changed', () => this.setGuide(this.guide));
  }

  setGuide(g: GuideId): void {
    this.guide = g;
    this.el.setAttribute('aria-label', `Talk to ${nameOf(activeGuide(g))}`);
    this.pose('hello');
  }

  pose(p: Expression): void {
    const a = activeGuide(this.guide);
    this.fig.classList.toggle('scout', a === 'scout');
    this.fig.innerHTML = figureHtml(a, p);
  }

  speak(line: Line, ms = 7000): void {
    this.pose(line.pose);
    this.bubble.textContent = line.text;
    this.bubble.hidden = false;
    this.el.classList.remove('hop');
    void this.el.offsetWidth;
    this.el.classList.add('hop');
    say(line.text, activeGuide(this.guide));
    clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      this.bubble.hidden = true;
      this.pose('hello');
    }, ms);
  }
}

export { critterSvg };
