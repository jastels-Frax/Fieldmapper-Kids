/** Tiny DOM builder. Text always goes through textContent, never innerHTML. */
import { icon } from './icons.ts';

type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

/** A full-screen sheet over the map. Returns the sheet body and a close function. */
export function openSheet(opts: { title: string; emoji?: string; onClose?: () => void; className?: string }): { body: HTMLElement; close: () => void; sheet: HTMLElement } {
  const close = () => {
    sheet.classList.add('leaving');
    setTimeout(() => sheet.remove(), 220);
    opts.onClose?.();
  };
  const body = h('div', { class: 'sheet-body' });
  const sheet = h('section', { class: `sheet ${opts.className ?? ''}`, role: 'dialog', 'aria-label': opts.title },
    h('header', { class: 'sheet-head' },
      // ✖, not ⬅️: it closes the whole screen, and must not be mistaken for the "⬅️ Go back" a step offers.
      h('button', { class: 'round-btn close-btn', 'aria-label': 'Close', onclick: close }, icon('close')),
      h('h1', {}, opts.emoji ? `${opts.emoji} ${opts.title}` : opts.title),
    ),
    body,
  );
  document.body.append(sheet);
  return { body, close, sheet };
}

export function toast(text: string, ms = 2600): void {
  const t = h('div', { class: 'toast', role: 'status' }, text);
  document.body.append(t);
  setTimeout(() => t.classList.add('leaving'), ms);
  setTimeout(() => t.remove(), ms + 300);
}

/** Friendly words for when something was found: "Tuesday morning". */
export function whenWords(iso: string): string {
  const d = new Date(iso);
  const hr = d.getHours();
  const part = hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : hr < 21 ? 'evening' : 'night';
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return part === 'night' ? 'Tonight' : `This ${part}`;
  if (same(d, yesterday)) return part === 'night' ? 'Last night' : `Yesterday ${part}`;
  return `${d.toLocaleDateString(undefined, { weekday: 'long' })} ${part}, ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}

/** Object URLs kept alive while their element is on the page; ONE observer frees them all. */
const liveUrls = new Map<Element, string[]>();
let urlObserver: MutationObserver | null = null;

export function blobUrl(blob: Blob, owner: Element): string {
  const url = URL.createObjectURL(blob);
  const list = liveUrls.get(owner) ?? [];
  list.push(url);
  liveUrls.set(owner, list);
  urlObserver ??= new MutationObserver(() => {
    for (const [el, urls] of liveUrls) {
      if (!el.isConnected) {
        urls.forEach(u => URL.revokeObjectURL(u));
        liveUrls.delete(el);
      }
    }
  });
  urlObserver.observe(document.body, { childList: true, subtree: true });
  return url;
}

export { uid } from './ids.ts';

/**
 * A big yes / no question, drawn for small hands. Most questions ask before something is lost ("Throw this find
 * away?"), so by default the SAFE answer (`no`) is the big first button and the one that loses something sits
 * second, quieter and marked. `go` is for a question whose yes loses nothing (a tick check?): yes comes first.
 */
export function askYesNo(text: string, yes: string, no: string, kind: 'danger' | 'go' = 'danger'): Promise<boolean> {
  return new Promise(resolve => {
    const done = (v: boolean) => { overlay.remove(); resolve(v); };
    const yesBtn = h('button', { class: kind === 'go' ? 'big-btn' : 'big-btn soft ask-lose', onclick: () => done(true) }, yes);
    const noBtn = h('button', { class: kind === 'go' ? 'big-btn soft' : 'big-btn', onclick: () => done(false) }, no);
    const overlay = h('div', { class: 'gate-overlay', role: 'dialog', 'aria-label': text },
      h('div', { class: 'gate-card' },
        h('p', { class: 'ask-text' }, text),
        h('div', { class: 'ask-row' }, ...(kind === 'go' ? [yesBtn, noBtn] : [noBtn, yesBtn])),
      ),
    );
    document.body.append(overlay);
  });
}
