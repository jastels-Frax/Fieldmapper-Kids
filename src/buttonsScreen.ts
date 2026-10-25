import type { Profile } from './types.ts';
import { h, openSheet } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { buddySays } from './buddyView.ts';
import { tierOf } from './tiers.ts';
import { TIER_TOOLS, TOOLS, moveTool, railFor, toggleTool, toolOf, type ToolId } from './railTools.ts';

/**
 * "My buttons": which buttons sit down the side of this explorer's map, and in what order. Every tap shows on the
 * map at once and is saved on their profile. Absent a choice, the rail is their age tier's (railTools.TIER_TOOLS);
 * "My age's buttons" goes back to that. No grown-up needed: nothing here changes data or safety.
 */
export function openMyButtons(profile: Profile, save: (p: Profile) => Promise<Profile>): void {
  const { body } = openSheet({ title: 'My buttons', emoji: '🔧', className: 'look' });
  const tier = tierOf(profile.tier);

  const commit = async (tools: ToolId[] | undefined, words: string) => {
    sounds.pick();
    say(words);
    profile = await save({ ...profile, tools });
    paint();
  };

  const paint = () => {
    const on = railFor(profile.tools, tier.id);
    const off = TOOLS.map(t => t.id).filter(id => !on.includes(id));
    body.replaceChildren(
      buddySays(profile.guide, { text: 'Pick the buttons for your map. Use the arrows to put them in order!', pose: 'point' }),
      h('div', { class: 'tool-list' }, ...[...on, ...off].map(id => {
        const t = toolOf(id);
        const isOn = on.includes(id);
        const i = on.indexOf(id);
        return h('div', { class: `tool-row ${isOn ? 'on' : ''}` },
          h('span', { class: 'tool-emoji', 'aria-hidden': 'true' }, t.emoji),
          h('span', { class: 'tool-text' }, h('strong', {}, t.word), h('span', {}, t.what)),
          isOn ? h('button', { class: 'round-btn small', 'aria-label': `Move ${t.word} up`, disabled: i === 0, onclick: () => void commit(moveTool(on, id, -1), `${t.word} up`) }, '⬆️') : null,
          isOn ? h('button', { class: 'round-btn small', 'aria-label': `Move ${t.word} down`, disabled: i === on.length - 1, onclick: () => void commit(moveTool(on, id, 1), `${t.word} down`) }, '⬇️') : null,
          h('button', {
            class: `switch-pill ${isOn ? 'on' : ''}`, 'aria-pressed': String(isOn), 'aria-label': `${t.word}: ${isOn ? 'on my map' : 'not on my map'}`,
            onclick: () => void commit(toggleTool(on, id), isOn ? `${t.word} off` : `${t.word} on`),
          }, isOn ? 'On' : 'Off'));
      })),
      profile.tools
        ? h('button', { class: 'big-btn soft', onclick: () => void commit(undefined, `Back to the ${tier.label} buttons`) }, `${tier.emoji} Back to the ${tier.label} buttons`)
        : h('p', { class: 'hint center' }, `${tier.emoji} These are the ${tier.label} buttons: ${TIER_TOOLS[tier.id].map(id => toolOf(id).word).join(', ')}.`),
    );
  };
  paint();
}
