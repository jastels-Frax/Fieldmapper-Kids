import type { Mode, Settings } from './types.ts';
import { AVATARS } from './categories.ts';
import { h } from './ui.ts';
import { MODE_INFO } from './grownUps.ts';
import { say } from './speech.ts';
import { buddyFigure, buddySays } from './buddyView.ts';
import { BUDDY_NAMES, type Buddy } from './buddies.ts';

/** First launch: who is exploring, and how. Resolves with the settings to keep. */
export function welcome(initial: Settings): Promise<Settings> {
  return new Promise(resolve => {
    const s: Settings = { ...initial };
    const card = h('div', { class: 'welcome-card' });
    const root = h('div', { class: 'welcome' }, card);
    document.body.append(root);

    const stepMode = () => {
      card.replaceChildren(
        h('div', { class: 'welcome-logo' }, '🧭'),
        h('h1', {}, 'Scout'),
        h('p', { class: 'welcome-tag' }, 'Explore, find and collect the world around you'),
        h('p', { class: 'welcome-sub' }, 'Hello grown-up! Who will be using this?'),
        ...(Object.keys(MODE_INFO) as Mode[]).map(m => {
          const info = MODE_INFO[m];
          return h('button', { class: 'mode-card', onclick: () => { s.mode = m; stepName(); } },
            h('span', { class: 'mode-emoji' }, info.emoji), h('strong', {}, info.title), h('span', {}, info.text));
        }),
        h('p', { class: 'hint' }, 'You can change this later in the Grown-up corner (🔒 on the map).'),
      );
    };

    const stepName = () => {
      const name = h('input', { class: 'text-in big', maxlength: 24, placeholder: 'First name', value: s.name, 'aria-label': "Explorer's first name" }) as HTMLInputElement;
      const avatars = h('div', { class: 'avatar-row' });
      const paint = () => avatars.replaceChildren(...AVATARS.map(a =>
        h('button', { class: `avatar ${s.avatar === a ? 'on' : ''}`, 'aria-label': `Choose ${a}`, onclick: () => { s.avatar = a; say('Nice choice!'); paint(); } }, a)));
      paint();
      card.replaceChildren(
        h('div', { class: 'welcome-logo' }, s.avatar),
        h('h1', {}, "What's the explorer's name?"),
        name,
        h('p', { class: 'welcome-sub' }, 'Pick a picture for you on the map!'),
        avatars,
        h('button', { class: 'big-btn', onclick: () => { s.name = name.value.trim(); stepBuddy(); } }, 'Next ➡️'),
        h('button', { class: 'text-btn', onclick: stepMode }, '⬅️ Back'),
      );
    };

    const stepBuddy = () => {
      const pick = (b: Buddy) => h('button', { class: `buddy-pick ${s.buddy === b ? 'on' : ''}`, onclick: () => {
        s.buddy = b;
        say(b === 'rat' ? 'Squeak! I am Pip! Let\'s explore together!' : 'Ribbit! I am Hop! Let\'s explore together!');
        stepBuddy();
      } }, buddyFigure(b, s.buddy === b ? 'excited' : 'hello', 'buddy-fig pick-fig'), h('strong', {}, BUDDY_NAMES[b]), h('span', {}, b === 'rat' ? 'the rat' : 'the frog'));
      card.replaceChildren(
        h('h1', {}, 'Pick your explorer buddy!'),
        h('p', { class: 'welcome-sub' }, 'Your buddy helps you on every adventure.'),
        h('div', { class: 'buddy-picks' }, pick('rat'), pick('frog')),
        h('button', { class: 'big-btn', onclick: stepGo }, `Explore with ${BUDDY_NAMES[s.buddy]} ➡️`),
        h('button', { class: 'text-btn', onclick: stepName }, '⬅️ Back'),
      );
    };

    const stepGo = () => {
      card.replaceChildren(
        buddySays(s.buddy, { text: `Ready, ${s.name || 'Explorer'}? Let's explore!`, pose: 'excited' }, { quiet: true, big: true }),
        h('p', { class: 'welcome-sub' }, 'The map needs to know where you are. Your phone will ask: tap "Allow".'),
        h('p', { class: 'hint' }, 'Your location, photos and voice notes stay on this device. Nothing is uploaded.'),
        h('button', { class: 'big-btn', onclick: () => { root.remove(); resolve(s); } }, "🚀 Let's explore!"),
        h('button', { class: 'text-btn', onclick: stepBuddy }, '⬅️ Back'),
      );
      say(`Ready, ${s.name || 'Explorer'}? Let's explore!`);
    };

    stepMode();
  });
}
