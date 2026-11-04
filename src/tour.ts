/**
 * The guided tour, on screen — Field Mapper's `src/tour/TourRunner.ts`, ported (its spotlight, its card placed
 * beside the target or as a sheet on a phone, its rules). What to show is `tourSteps.ts`; this file only draws,
 * measures and remembers.
 *
 * Rules kept from Field Mapper:
 * - **It never points at nothing.** A target not drawn is skipped (and stays unseen, so it shows the day it is
 *   there), or, for a crew member's part, the card is centred and says it anyway (`ifMissing: 'centre'`).
 * - **It waits for the screen.** While a screen, the opening screen, a question or a celebration is up it tries
 *   again every 1.5 s (for two minutes), so it starts on the map once the explorer gets there.
 * - **Every word goes in through `textContent`**; the only markup is our own constant character art.
 * Scout's departures: the card shows who is speaking (the guide, or the crew member whose part it is) and reads it
 * aloud in their voice when reading aloud is on, with 🔊 to hear it anyway; buttons are child-sized; what has been
 * seen is kept per EXPLORER (`scout.tour.<explorer id>`), since each explorer gets the tour.
 *
 * Prefix `tour-`; z-index 85: over the map, the screens and the opening screen, under a grown-up question (90),
 * confetti and toasts.
 */
import type { GuideId } from './types.ts';
import type { Expression } from './buddies.ts';
import { CAST } from './cast.ts';
import { activeGuide } from './guides.ts';
import { guideFigure, nameOf } from './buddyView.ts';
import { say, sayNow } from './speech.ts';
import { sounds } from './sound.ts';
import { icon } from './icons.ts';
import { TOUR, fill, introFor, markSeen, pendingSteps, stepToShow, type SeenMap, type Speaker, type TourStep } from './tourSteps.ts';

export interface TourHost {
  /** The explorer: their id (whose tour this is), name and guide. */
  profileId: string;
  name: string;
  guide: GuideId;
}

const KEY = (id: string) => `scout.tour.${id}`;

function loadSeen(profileId: string): SeenMap {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(profileId)) || '{}');
    return v && typeof v === 'object' ? v as SeenMap : {};
  } catch { return {}; }
}

function saveSeen(profileId: string, s: SeenMap): void {
  try { localStorage.setItem(KEY(profileId), JSON.stringify(s)); } catch { /* a private window forgets: the tour shows again */ }
}

/** Something else has the screen: a screen (sheet), the opening or welcome screen, a question, a celebration, a tool, a toast (which sits above the tour). */
function busy(): boolean {
  return !!document.querySelector('.sheet, .launch, .welcome, .gate-overlay, .celebrate, .tour-root, .picker, .toast')
    || document.body.classList.contains('drawing') || document.body.classList.contains('picking');
}

/** The element, if it is drawn and not covered by something else. */
function drawnEl(sel: string): HTMLElement | null {
  let el: HTMLElement | null = null;
  try { el = document.querySelector<HTMLElement>(sel); } catch { return null; }
  if (!el || el.closest('.tour-root')) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  const cs = getComputedStyle(el);
  if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return null;
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  if (x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight) {
    const top = document.elementsFromPoint(x, y).find(e => !e.closest('.tour-root'));
    if (top && top !== el && !el.contains(top) && !top.contains(el)) return null;
  }
  return el;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

let running = false;
let waiter: number | undefined;
let wantAll = false;

export function tourRunning(): boolean {
  return running;
}

/**
 * Asks for the tour: the steps the explorer has not seen (a new explorer: all of them), or every step when `all`
 * (How to use). It starts once nothing else has the screen, trying every 1.5 s for two minutes, for whoever is
 * exploring THEN (`host` is asked at that moment: the explorer may have been switched on the opening screen
 * meanwhile). One request waits at a time.
 */
export function requestTour(host: () => TourHost, o: { all?: boolean } = {}): void {
  if (o.all) wantAll = true;
  if (waiter !== undefined || running) return;
  let attempts = 0;
  const tick = () => {
    waiter = undefined;
    if (busy()) {
      if (++attempts < 80) waiter = window.setTimeout(tick, 1500);
      else wantAll = false;
      return;
    }
    const all = wantAll;
    wantAll = false;
    void runTour(host(), all);
  };
  waiter = window.setTimeout(tick, 700);
}

async function runTour(host: TourHost, all: boolean): Promise<void> {
  if (running || !host.profileId) return;
  const seen = loadSeen(host.profileId);
  const steps = all ? TOUR : pendingSteps(TOUR, seen);
  if (!steps.length) return;
  running = true;
  try {
    const shown = await walk(host, steps, all ? {} : seen);
    saveSeen(host.profileId, markSeen(loadSeen(host.profileId), shown));
  } finally {
    running = false;
    document.querySelector('.tour-root')?.remove();
  }
}

interface Card { step: TourStep | null; title: string; body: string; speaker: Speaker; pose: Expression }

async function walk(host: TourHost, steps: TourStep[], seen: SeenMap): Promise<TourStep[]> {
  const guide = activeGuide(host.guide);
  const guideName = nameOf(guide);
  const intro = introFor(steps, seen, guideName, host.name);
  const cards: Card[] = [
    { step: null, title: intro.title, body: intro.body, speaker: 'guide', pose: 'hello' },
    ...steps.map((s, i): Card => ({
      step: s, title: fill(s.title, host.name, guideName), body: fill(s.body, host.name, guideName), speaker: s.speaker,
      pose: i === steps.length - 1 ? 'success' : s.target ? 'point' : 'listen',
    })),
  ];
  const root = el('div', 'tour-root');
  root.setAttribute('role', 'presentation');
  root.append(el('div', 'tour-catch'), el('div', 'tour-spot'));
  document.body.append(root);

  const shown = new Set<TourStep>();
  let i = 0;
  let back = false;
  for (;;) {
    const c = cards[i];
    const target = c.step?.target ? drawnEl(c.step.target) : null;
    const how = c.step ? stepToShow(c.step, !!target) : 'centre';
    if (how === 'skip') {
      // Not on screen: not pointed at, and still unseen. Going back skips it backwards too (the first card, the
      // welcome, is never skipped, so this always lands somewhere).
      if (back) { i--; continue; }
      if (++i >= cards.length) break;
      continue;
    }
    back = false;
    const act = await show(root, c, how === 'target' ? target : null, i, cards.length, guide);
    if (c.step) shown.add(c.step);
    if (act === 'next') { if (++i >= cards.length) break; }
    else if (act === 'back') { i = Math.max(0, i - 1); back = true; }
    else { // skip: the whole tour counts as seen
      sounds.tap();
      return steps;
    }
  }
  sounds.save();
  return [...shown];
}

function show(root: HTMLElement, c: Card, target: HTMLElement | null, index: number, total: number, guide: GuideId): Promise<'next' | 'back' | 'skip'> {
  root.querySelector('.tour-card')?.remove();
  const rect = place(root, target);
  const who: GuideId = c.speaker === 'guide' ? guide : c.speaker;
  const label = c.speaker === 'guide' ? nameOf(who) : `${nameOf(who)} · ${CAST[c.speaker].role}`;

  const card = el('div', `tour-card ${c.speaker === 'guide' ? '' : 'crew'}`);
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', c.title);
  const hear = el('button', 'round-btn small tour-hear');
  hear.type = 'button';
  hear.setAttribute('aria-label', 'Hear it');
  hear.append(icon('speaker'));
  hear.addEventListener('click', () => sayNow(`${c.title}. ${c.body}`, who));
  const head = el('div', 'tour-head');
  const titles = el('div', 'tour-titles');
  titles.append(el('span', 'tour-who', label), el('strong', 'tour-title', c.title));
  head.append(guideFigure(who, c.pose, 'buddy-fig tour-fig'), titles, hear);
  card.append(head, el('p', 'tour-body', c.body));

  const dots = el('div', 'tour-dots');
  dots.setAttribute('aria-label', `${index + 1} of ${total}`);
  for (let k = 0; k < total; k++) dots.append(el('span', k === index ? 'tour-dot on' : 'tour-dot'));
  const foot = el('div', 'tour-foot');
  const btn = (cls: string, act: 'next' | 'back' | 'skip', ...kids: (Node | string)[]) => {
    const b = el('button', cls);
    b.type = 'button';
    b.dataset.act = act;
    b.append(...kids);
    return b;
  };
  const prev = btn('round-btn tour-back', 'back', icon('back'));
  prev.setAttribute('aria-label', 'Back');
  prev.disabled = index === 0;
  const last = index === total - 1;
  const next = btn('big-btn tour-next', 'next', last ? '✨ Let\'s go!' : index === 0 ? 'Show me ' : 'Next ', ...(last ? [] : [icon('forward')]));
  foot.append(btn('text-btn tour-skip', 'skip', 'Skip'), el('span', 'tour-gap'), prev, next);
  card.append(dots, foot);
  root.append(card);
  position(card, rect);
  next.focus();
  say(`${c.title}. ${c.body}`, who);

  return new Promise(resolve => {
    const finish = (a: 'next' | 'back' | 'skip') => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      resolve(a);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finish('skip'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); finish('next'); }
      else if (e.key === 'ArrowLeft' && index > 0) { e.preventDefault(); e.stopImmediatePropagation(); finish('back'); }
      else if (e.key === 'Tab') {
        const f = [...card.querySelectorAll<HTMLElement>('button:not([disabled])')];
        if (!f.length) return;
        const at = f.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    };
    const onResize = () => position(card, place(root, target && document.contains(target) ? target : null));
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    card.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
      if (b && !b.disabled) { sounds.tap(); finish(b.dataset.act as 'next' | 'back' | 'skip'); }
    });
  });
}

/** Light up `target` (the rest dimmed by the spot's huge shadow), or dim everything for a centred card. */
function place(root: HTMLElement, target: HTMLElement | null): DOMRect | null {
  const spot = root.querySelector<HTMLElement>('.tour-spot')!;
  root.classList.toggle('tour-dim', !target);
  if (!target) { spot.hidden = true; return null; }
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const r = target.getBoundingClientRect();
  const pad = 6;
  spot.hidden = false;
  Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
  return r;
}

/** Beside the target where there is room; on a phone a sheet at the bottom, or the top when the target is low. */
function position(card: HTMLElement, r: DOMRect | null): void {
  const vw = window.innerWidth, vh = window.innerHeight;
  card.classList.remove('tour-sheet', 'tour-sheet-top');
  card.style.left = card.style.top = '';
  if (vw <= 640) {
    card.classList.add(r && r.top + r.height / 2 > vh * 0.5 ? 'tour-sheet-top' : 'tour-sheet');
    return;
  }
  const cw = card.offsetWidth, ch = card.offsetHeight, gap = 16, m = 12;
  let x: number, y: number;
  if (!r) { x = (vw - cw) / 2; y = (vh - ch) / 2; }
  else if (r.right + gap + cw <= vw - m) { x = r.right + gap; y = r.top + r.height / 2 - ch / 2; }
  else if (r.left - gap - cw >= m) { x = r.left - gap - cw; y = r.top + r.height / 2 - ch / 2; }
  else if (r.bottom + gap + ch <= vh - m) { x = r.left + r.width / 2 - cw / 2; y = r.bottom + gap; }
  else { x = r.left + r.width / 2 - cw / 2; y = r.top - gap - ch; }
  card.style.left = `${Math.round(Math.max(m, Math.min(vw - cw - m, x)))}px`;
  card.style.top = `${Math.round(Math.max(m, Math.min(vh - ch - m, y)))}px`;
}
