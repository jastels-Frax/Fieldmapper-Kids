import type { Profile } from './types.ts';
import { BUTTON_STYLES, FONTS, MOTIONS, TEXT_SIZES, THEMES, normalizeLook, type Choice, type Look } from './look.ts';
import { applyLook } from './lookApply.ts';
import { h, openSheet } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { buddySays } from './buddyView.ts';

/**
 * "My look": the explorer chooses how Scout looks. Every tap paints at once (a
 * picker you cannot see the result of is not a picker) and is saved on their
 * profile, so each explorer keeps their own look. No grown-up needed: nothing
 * here changes data or safety.
 */
export function openLook(profile: Profile, save: (p: Profile) => Promise<void>): void {
  let look = normalizeLook(profile.look);
  const { body } = openSheet({ title: 'My look', emoji: '🎨', className: 'look' });

  const set = async <K extends keyof Look>(key: K, value: Look[K], label: string) => {
    look = { ...look, [key]: value };
    applyLook(look);
    sounds.pick();
    say(label);
    profile = { ...profile, look };
    await save(profile);
    paint();
  };

  const section = <K extends keyof Look>(title: string, key: K, list: Choice<Look[K] & string>[], small = false, swatch?: (c: Choice<Look[K] & string>) => Node | null) =>
    [h('h2', { class: 'section-title' }, title),
      h('div', { class: `look-grid ${small ? 'small' : ''}` }, ...list.map(c =>
        h('button', { class: `look-card ${look[key] === c.id ? 'on' : ''}`, 'aria-pressed': String(look[key] === c.id), onclick: () => void set(key, c.id as Look[K], `${c.label}. ${c.hint}`) },
          swatch?.(c) ?? h('span', { class: 'look-emoji' }, c.emoji),
          h('strong', {}, `${swatch ? `${c.emoji} ` : ''}${c.label}`),
          h('span', { class: 'look-hint' }, c.hint))))];

  const paint = () => {
    const top = body.scrollTop;
    body.replaceChildren(
      buddySays(profile.guide, { text: 'Make Scout look just the way you like! Tap to try.', pose: 'excited' }, { quiet: true }),
      ...section('Colours', 'theme', THEMES, false, c => {
        const t = THEMES.find(x => x.id === c.id)!;
        return h('span', { class: 'look-swatch', 'aria-hidden': 'true' }, ...t.swatch.map(col => h('i', { style: `background:${col}` })));
      }),
      ...section('Buttons', 'buttons', BUTTON_STYLES, true),
      ...section('Words', 'text', TEXT_SIZES, true),
      ...section('Letters', 'font', FONTS, true),
      ...section('Moving', 'motion', MOTIONS, true),
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
