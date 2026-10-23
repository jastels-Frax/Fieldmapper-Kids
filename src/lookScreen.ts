import type { Profile } from './types.ts';
import { FONT_STACKS, LOOK_KEYS, THEMES, choicesFor, normalizeLook, surpriseLook, withTheme, type Choice, type Look } from './look.ts';
import { applyLook } from './lookApply.ts';
import { h, openSheet } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { buddySays } from './buddyView.ts';
import { confetti } from './confetti.ts';

const TITLES: Record<keyof Look, string> = {
  theme: '🎨 Colours', buttons: '🔘 Buttons', pattern: '🧩 Background', header: '🏳️ Top strip', pins: '📍 Map pins',
  party: '🎉 Celebrations', text: '🔠 Word size', font: '✍️ Letters', motion: '🌀 Moving',
};

/** Which switches get the small grid (their cards are short). */
const SMALL = new Set<keyof Look>(['text', 'motion', 'pins', 'party', 'header']);

/**
 * "My look": the explorer chooses how Scout looks. Every tap paints at once (a
 * picker you cannot see the result of is not a picker) and is saved on their
 * profile, so each explorer keeps their own look. Every card shows its choice
 * itself — a button in that style, the pattern, the letters — because a row of
 * names that all look alike is how the button styles came to seem identical.
 * No grown-up needed: nothing here changes data or safety.
 */
export function openLook(profile: Profile, save: (p: Profile) => Promise<void>): void {
  let look = normalizeLook(profile.look);
  const { body } = openSheet({ title: 'My look', emoji: '🎨', className: 'look' });

  const commit = async (next: Look, words: string) => {
    look = next;
    applyLook(look);
    sounds.pick();
    say(words);
    profile = { ...profile, look };
    await save(profile);
    paint();
  };

  const sample = (key: keyof Look, c: Choice<string>): Node => {
    switch (key) {
      case 'theme': {
        const t = THEMES.find(x => x.id === c.id)!;
        if (t.art) return h('span', { class: 'look-art', 'data-art': t.id, 'aria-hidden': 'true' });
        return h('span', { class: 'look-swatch', 'aria-hidden': 'true' }, ...t.swatch.map(col => h('i', { style: `background:${col}` })));
      }
      case 'buttons': return h('span', { class: 'bs-btn', 'data-bs': c.id, 'aria-hidden': 'true' }, `${c.emoji} Go!`);
      case 'pattern': return h('span', { class: 'pat-swatch', 'data-pat': c.id, 'aria-hidden': 'true' });
      case 'header': return h('span', { class: 'hd-swatch', 'data-hd': c.id, 'aria-hidden': 'true' }, 'Aa');
      case 'pins': return h('span', { class: 'pin-sample', 'data-pn': c.id, 'aria-hidden': 'true' }, h('span', { class: 'pin-shape' }, h('span', {}, '🍄')));
      case 'font': return h('span', { class: 'look-emoji', style: `font-family:${FONT_STACKS[c.id as Look['font']]}`, 'aria-hidden': 'true' }, 'Aa');
      default: return h('span', { class: 'look-emoji' }, c.emoji);
    }
  };

  const section = <K extends keyof Look>(key: K) =>
    [h('h2', { class: 'section-title' }, TITLES[key]),
      h('div', { class: `look-grid ${SMALL.has(key) ? 'small' : ''}` }, ...choicesFor(key).map(c => {
        const on = look[key] === c.id;
        const shown = key === 'theme' || key === 'pattern' || key === 'header' || key === 'font';
        const feature = key === 'theme' && THEMES.some(t => t.id === c.id && t.art);
        return h('button', {
          class: `look-card ${on ? 'on' : ''} ${feature ? 'feature' : ''}`, 'aria-pressed': String(on),
          onclick: () => {
            if (key === 'party') confetti([], c.id as Look['party']);
            const next = key === 'theme' ? withTheme(look, c.id as Look['theme']) : { ...look, [key]: c.id };
            void commit(next, `${c.label}. ${c.hint}`);
          },
        },
        sample(key, c as Choice<string>),
        h('strong', { style: key === 'font' ? `font-family:${FONT_STACKS[c.id as Look['font']]}` : '' }, `${shown && key !== 'font' ? `${c.emoji} ` : ''}${c.label}`),
        h('span', { class: 'look-hint' }, c.hint));
      }))];

  const paint = () => {
    const top = body.scrollTop;
    body.replaceChildren(
      buddySays(profile.guide, { text: 'Make Scout look just the way you like! Tap to try.', pose: 'excited' }, { quiet: true }),
      h('button', { class: 'big-btn', onclick: () => {
        const next = surpriseLook(look);
        confetti([], next.party);
        void commit(next, 'Surprise! A brand new look!');
      } }, '🎲 Surprise me!'),
      ...LOOK_KEYS.flatMap(k => section(k)),
      h('button', { class: 'text-btn', onclick: () => void (async () => {
        look = normalizeLook(undefined);
        applyLook(look);
        profile = { ...profile, look: undefined };
        await save(profile);
        say('Back to the start!');
        paint();
      })() }, '↩️ Back to how it started'),
    );
    body.scrollTop = top;
  };
  paint();
  say('Make Scout look just the way you like!');
}
