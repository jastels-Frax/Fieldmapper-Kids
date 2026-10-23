import type { Mode, Profile } from './types.ts';
import { h, toast } from './ui.ts';
import { say } from './speech.ts';
import { buddySays } from './buddyView.ts';
import { MODE_INFO, newProfile, welcomeForm } from './profiles.ts';
import { guideName } from './guides.ts';

/** First launch: who is exploring, how, and with which guide. Resolves with the first explorer. */
export function welcome(): Promise<Profile> {
  return new Promise(resolve => {
    const p = newProfile();
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
          return h('button', { class: 'mode-card', onclick: () => { p.mode = m; stepMe(); } },
            h('span', { class: 'mode-emoji' }, info.emoji), h('strong', {}, info.title), h('span', {}, info.text));
        }),
        h('p', { class: 'hint' }, 'You can add more explorers later, each with their own finds.'),
      );
      root.scrollTop = 0;
    };

    const stepMe = () => {
      card.replaceChildren(
        h('h1', {}, 'Make your explorer card'),
        welcomeForm(p),
        h('button', { class: 'big-btn', onclick: () => {
          if (!p.name) { toast("Type the explorer's name first."); return; }
          stepGo();
        } }, 'Next ➡️'),
        h('button', { class: 'text-btn', onclick: stepMode }, '⬅️ Back'),
      );
      root.scrollTop = 0;
    };

    const stepGo = () => {
      const g = guideName(p.guide, p.guideName);
      card.replaceChildren(
        buddySays(p.guide, { text: `Ready, ${p.name}? I am ${g}. Let's explore!`, pose: 'excited' }, { quiet: true, big: true }),
        h('p', { class: 'welcome-sub' }, 'The map needs to know where you are. Your phone will ask: tap "Allow".'),
        h('p', { class: 'hint' }, 'Your location, photos and voice notes stay on this device. Nothing is uploaded.'),
        h('button', { class: 'big-btn', onclick: () => { root.remove(); resolve(p); } }, "🚀 Let's explore!"),
        h('button', { class: 'text-btn', onclick: stepMe }, '⬅️ Back'),
      );
      root.scrollTop = 0;
      say(`Ready, ${p.name}? I am ${g}. Let's explore!`);
    };

    stepMode();
  });
}
