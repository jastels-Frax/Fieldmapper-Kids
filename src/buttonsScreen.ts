import type { CategoryId, Profile, QuickPref } from './types.ts';
import { h, openSheet } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { buddySays } from './buddyView.ts';
import { tierOf } from './tiers.ts';
import { kindIcon } from './kindIcon.ts';
import { MAX_QUICK, QUICK_CHOICES, pickedKinds, quickFace, toggleQuickKind } from './quickFinds.ts';
import { TOOLS, barFor, moveTool, placeInBar, railFor, toggleTool, toolOf, type ToolId } from './railTools.ts';

/** The two places beside "I found something!", as said aloud. */
const SIDE = ['left', 'right'] as const;

/**
 * "My buttons": which two buttons sit beside "I found something!" (`Profile.bar`; absent = My Finds and Photo), which
 * run down the side of this explorer's map and in what order (`Profile.rail`; absent = their age tier's,
 * railTools.TIER_TOOLS). Every tap shows on the map at once and is saved on their profile; "Back to the … buttons"
 * goes back to the defaults. Putting a button beside "I found something!" swaps out the one there
 * (railTools.placeInBar), so no button is ever lost. Below, their 📸 quick finds (`Profile.quick`): off until turned
 * on, then the kinds they pick (up to MAX_QUICK) or, picking none, the kinds they find most. No grown-up needed:
 * nothing here changes data or safety.
 */
export function openMyButtons(profile: Profile, save: (p: Profile) => Promise<Profile>, mostFound: () => CategoryId[] = () => ['bird']): void {
  const { body } = openSheet({ title: 'My buttons', emoji: '🔧', className: 'look' });
  const tier = tierOf(profile.tier);
  /** The bar place being changed (0 left, 1 right), whose choices show under the bar. */
  let editing: 0 | 1 | null = null;

  /** Saves the rail and the bar (undefined = the default), and drops the rail stored the pre-2.12 way. */
  const commit = async (rail: ToolId[] | undefined, bar: readonly string[] | undefined, words: string) => {
    sounds.pick();
    say(words);
    const { tools: _old, rail: _rail, bar: _bar, ...rest } = profile;
    profile = await save({ ...rest, ...(rail ? { rail } : {}), ...(bar ? { bar: [...bar] } : {}) });
    paint();
  };

  const commitQuick = async (quick: QuickPref, words: string) => {
    sounds.pick();
    say(words);
    profile = await save({ ...profile, quick });
    paint();
  };

  /** The quick-finds part: a switch, then (on) the kinds to show. */
  const quickPart = (): HTMLElement => {
    const q = profile.quick;
    const on = !!q?.on;
    const picked = pickedKinds(q?.kinds);
    const part = h('div', { class: 'quick-pick' },
      h('h2', { class: 'section-title' }, '📸 Quick finds'),
      h('div', { class: `tool-row ${on ? 'on' : ''}` },
        h('span', { class: 'tool-emoji', 'aria-hidden': 'true' }, '📸'),
        h('span', { class: 'tool-text' }, h('strong', {}, 'Quick finds'), h('span', {}, 'Small buttons above I found something: tap, take a photo, saved.')),
        h('button', {
          class: `switch-pill ${on ? 'on' : ''}`, 'aria-pressed': String(on), 'aria-label': `Quick finds: ${on ? 'on' : 'off'}`,
          onclick: () => void commitQuick({ ...q, on: !on }, on ? 'Quick finds off' : 'Quick finds on'),
        }, on ? 'On' : 'Off')));
    if (!on) return part;
    part.append(
      h('div', { class: 'quick-modes' },
        h('button', {
          class: `mini-choice ${picked.length ? '' : 'on'}`, 'aria-pressed': String(!picked.length),
          onclick: () => void commitQuick({ on: true }, 'The things I find most'),
        }, '✨ The things I find most'),
        h('button', {
          class: `mini-choice ${picked.length ? 'on' : ''}`, 'aria-pressed': String(!!picked.length),
          // Picking starts from the kinds already showing, so nothing changes until a kind is tapped.
          onclick: () => { if (!picked.length) void commitQuick({ on: true, kinds: pickedKinds(mostFound()) }, `Pick up to ${MAX_QUICK}`); },
        }, '👆 I\'ll pick')),
    );
    if (picked.length) {
      const full = picked.length >= MAX_QUICK;
      part.append(
        h('p', { class: 'hint' }, `Pick up to ${MAX_QUICK}: ${picked.map(k => quickFace(k).label).join(', ')}. Make each find a fern, a frog… later in My Finds.`),
        // The top of "What is it?" only: a quick find is saved as its group and made a fern or a frog later.
        h('div', { class: 'mini-choices' }, ...QUICK_CHOICES.map(id => {
          const q = quickFace(id);
          const isOn = picked.includes(id);
          return h('button', {
            class: `mini-choice ${isOn ? 'on' : ''}`, 'aria-pressed': String(isOn), disabled: !isOn && full,
            onclick: () => {
              const kinds = toggleQuickKind(picked, id);
              // Taking the last one off goes back to "the things I find most", which is what an empty pick means.
              void commitQuick(kinds.length ? { on: true, kinds } : { on: true }, isOn ? `${q.label} off` : `${q.label} on`);
            },
          }, kindIcon(q, 'mini-emoji'), q.label);
        })),
      );
    }
    return part;
  };

  /** The two buttons beside "I found something!": tap one, then the button to put there. */
  const barPart = (bar: [ToolId, ToolId], rail: ToolId[]): HTMLElement[] => {
    const slot = (i: 0 | 1) => {
      const t = toolOf(bar[i]);
      const isOn = editing === i;
      return h('button', {
        class: `nav-btn bar-slot ${isOn ? 'on' : ''}`, 'aria-pressed': String(isOn),
        'aria-label': `On the ${SIDE[i]}: ${t.word}. Tap to change it`,
        onclick: () => {
          sounds.tap();
          editing = isOn ? null : i;
          if (editing != null) say(`Which button goes on the ${SIDE[i]}?`);
          paint();
        },
      }, h('span', { class: 'nav-emoji', 'aria-hidden': 'true' }, t.emoji), t.word);
    };
    const part: HTMLElement[] = [
      h('h2', { class: 'section-title' }, '✨ Beside I found something!'),
      h('div', { class: 'bar-pick' }, slot(0), h('span', { class: 'bar-pick-found', 'aria-hidden': 'true' }, h('span', { class: 'bar-pick-emoji' }, '✨'), h('span', { class: 'bar-pick-words' }, 'I found something!')), slot(1)),
    ];
    if (editing == null) {
      part.push(h('p', { class: 'hint center' }, 'Tap one to change it.'));
      return part;
    }
    const i = editing;
    part.push(
      h('p', { class: 'hint' }, `Which button goes on the ${SIDE[i]}? The one there now swaps places with it.`),
      h('div', { class: 'mini-choices bar-choices' }, ...TOOLS.map(t => {
        const isOn = bar[i] === t.id;
        return h('button', {
          class: `mini-choice ${isOn ? 'on' : ''}`, 'aria-pressed': String(isOn),
          onclick: () => {
            editing = null;
            if (isOn) { sounds.tap(); paint(); return; }
            const next = placeInBar(bar, rail, i, t.id);
            void commit(next.rail, next.bar, `${t.word} on the ${SIDE[i]}`);
          },
        }, h('span', { class: 'mini-emoji', 'aria-hidden': 'true' }, t.emoji), t.word);
      })),
    );
    return part;
  };

  const paint = () => {
    const bar = barFor(profile.bar);
    const on = railFor(profile, tier.id);
    const off = TOOLS.map(t => t.id).filter(id => !on.includes(id) && !bar.includes(id));
    const chosen = !!(profile.rail || profile.tools || profile.bar);
    body.replaceChildren(
      buddySays(profile.guide, { text: 'Pick the buttons for your map. Use the arrows to put them in order!', pose: 'point' }),
      ...barPart(bar, on),
      h('h2', { class: 'section-title' }, '🗺️ Down the side of my map'),
      h('div', { class: 'tool-list' }, ...[...on, ...off].map(id => {
        const t = toolOf(id);
        const isOn = on.includes(id);
        const i = on.indexOf(id);
        return h('div', { class: `tool-row ${isOn ? 'on' : ''}` },
          h('span', { class: 'tool-emoji', 'aria-hidden': 'true' }, t.emoji),
          h('span', { class: 'tool-text' }, h('strong', {}, t.word), h('span', {}, t.what)),
          isOn ? h('button', { class: 'round-btn small', 'aria-label': `Move ${t.word} up`, disabled: i === 0, onclick: () => void commit(moveTool(on, id, -1), profile.bar, `${t.word} up`) }, '⬆️') : null,
          isOn ? h('button', { class: 'round-btn small', 'aria-label': `Move ${t.word} down`, disabled: i === on.length - 1, onclick: () => void commit(moveTool(on, id, 1), profile.bar, `${t.word} down`) }, '⬇️') : null,
          h('button', {
            class: `switch-pill ${isOn ? 'on' : ''}`, 'aria-pressed': String(isOn), 'aria-label': `${t.word}: ${isOn ? 'on my map' : 'not on my map'}`,
            onclick: () => void commit(toggleTool(on, id), profile.bar, isOn ? `${t.word} off` : `${t.word} on`),
          }, isOn ? 'On' : 'Off'));
      })),
      chosen
        ? h('button', { class: 'big-btn soft', onclick: () => { editing = null; void commit(undefined, undefined, `Back to the ${tier.label} buttons`); } }, `${tier.emoji} Back to the ${tier.label} buttons`)
        : h('p', { class: 'hint center' }, `${tier.emoji} These are the ${tier.label} buttons.`),
      quickPart(),
    );
  };
  paint();
}
