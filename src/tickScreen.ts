import type { Settings } from './types.ts';
import { GUIDE_DISCLAIMER, PET_SPOT, TICK_GUIDE, TICK_SPOTS, allClear } from './tickGuide.ts';
import { h, openSheet } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { confetti } from './confetti.ts';
import { crewSays } from './buddyView.ts';

export interface TickHost {
  settings: Settings;
  /** Called once when the explorer finishes a check. */
  done: () => Promise<void>;
}

/** The grown-ups' how-to, folded by default so the child's checklist comes first. */
export function tickHowTo(open = false): HTMLElement {
  const d = h('details', { class: 'tick-guide' },
    h('summary', {}, '🧑‍🏫 For grown-ups: how to check for ticks and remove one'),
    ...TICK_GUIDE.map(s => h('section', {},
      h('h3', {}, `${s.emoji} ${s.title}`),
      h('ul', {}, ...s.points.map(p => h('li', {}, p))),
    )),
    h('p', { class: 'hint' }, GUIDE_DISCLAIMER),
  ) as HTMLDetailsElement;
  d.open = open;
  return d;
}

/**
 * The end-of-adventure tick check: tap each place once it has been looked at.
 * `summary` is a line about the adventure just finished, if there is one.
 */
export function openTickCheck(host: TickHost, summary?: string): void {
  const { body, close } = openSheet({ title: 'Tick check', emoji: '🕷️', className: 'ticks' });
  const checked = new Set<string>();
  let recorded = false;

  const intro = `${summary ? `${summary} ` : ''}Before you go inside, let's do a tick check! Ticks are tiny bugs that hide in warm spots. Ask your grown-up to help you look.`;
  body.append(crewSays('bear', { text: `I am Bramble, the safety ranger. ${intro}`, pose: 'point' }));

  const status = h('p', { class: 'tick-status', role: 'status' });
  const finish = h('button', { class: 'big-btn', hidden: true }, '✅ All clear!');
  const paint = () => {
    const n = TICK_SPOTS.filter(s => checked.has(s.id)).length;
    status.textContent = `${n} of ${TICK_SPOTS.length} places checked`;
    finish.hidden = !allClear(checked);
  };

  const spot = (s: typeof TICK_SPOTS[number]) => {
    const b = h('button', { class: 'tick-spot', 'aria-pressed': 'false' },
      h('span', { class: 'tick-spot-emoji' }, s.emoji), h('span', { class: 'tick-spot-text' }, s.text), h('span', { class: 'tick-spot-box' }, '⬜'));
    b.addEventListener('click', () => {
      const on = !checked.has(s.id);
      if (on) { checked.add(s.id); sounds.pick(); say(`${s.text}. No ticks!`); } else checked.delete(s.id);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      (b.querySelector('.tick-spot-box') as HTMLElement).textContent = on ? '✅' : '⬜';
      paint();
    });
    return b;
  };

  finish.addEventListener('click', async () => {
    if (!recorded) {
      recorded = true;
      await host.done();
    }
    sounds.save();
    confetti(['✅', '🕷️']);
    body.replaceChildren(
      crewSays('bear', { text: 'All clear! Great job checking. Ranger Bramble is proud of you!', pose: 'success' }, { big: true }),
      h('div', { class: 'fact-card' }, h('span', { class: 'fact-emoji' }, '👕'), h('p', {}, 'Grown-ups: popping outdoor clothes in a hot dryer for 10 minutes gets rid of any ticks hiding on them.')),
      h('button', { class: 'big-btn', onclick: close }, '🗺️ Back to the map'),
      tickHowTo(),
    );
  });

  const found = h('button', { class: 'big-btn danger-btn' }, '😮 I found a tick!');
  found.addEventListener('click', () => {
    sounds.oops();
    const guide = tickHowTo(true);
    body.replaceChildren(
      crewSays('bear', { text: "Don't touch it! Stay still and get your grown-up right away. They know what to do.", pose: 'confused' }, { big: true }),
      guide,
      h('button', { class: 'big-btn soft', onclick: () => { close(); openTickCheck(host, summary); } }, '🔁 Check again'),
      h('button', { class: 'big-btn', onclick: close }, '🗺️ Back to the map'),
    );
  });

  body.append(
    status,
    h('div', { class: 'tick-spots' }, ...TICK_SPOTS.map(spot)),
    h('div', { class: 'tick-spots' }, spot(PET_SPOT)),
    finish,
    found,
    tickHowTo(),
  );
  paint();
}
