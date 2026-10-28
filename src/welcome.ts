import { labelled } from './icons.ts';
import type { Mode, Profile } from './types.ts';
import { h, toast } from './ui.ts';
import { say } from './speech.ts';
import { buddySays } from './buddyView.ts';
import { MODE_INFO, newProfile, tierPicker, welcomeForm } from './profiles.ts';
import { TIERS, tierOf } from './tiers.ts';
import { GUIDE_INFO, activeGuide, guideName } from './guides.ts';

/** First launch: who is exploring, how, and with which guide. Resolves with the first explorer. */
export function welcome(): Promise<Profile> {
  return new Promise(resolve => {
    const p = newProfile();
    const card = h('div', { class: 'welcome-card' });
    const root = h('div', { class: 'welcome' }, card);
    document.body.append(root);

    // 1. The age tier: it suggests the starting mode and look (both changeable later).
    const stepTier = () => {
      card.replaceChildren(
        h('div', { class: 'welcome-logo' }, '🧭'),
        h('h1', {}, 'Scout'),
        h('p', { class: 'welcome-tag' }, 'Explore, find and collect the world around you'),
        h('p', { class: 'welcome-sub' }, 'Hello grown-up! How old is the explorer?'),
        tierPicker(p.tier ?? null, t => {
          const tier = tierOf(t);
          p.tier = t;
          p.mode = tier.defaultMode;
          p.look = Object.keys(tier.defaultLook).length ? { ...tier.defaultLook } : undefined;
          setTimeout(stepMode, 350);
          return true;
        }),
        h('p', { class: 'hint' }, `Only the level is kept, never an age or a birthday. ${TIERS.length} levels; you can change it later on the explorer's card.`),
      );
      root.scrollTop = 0;
    };

    // 2. On their own, or with a grown-up beside them.
    const stepMode = () => {
      card.replaceChildren(
        h('h1', {}, 'How will they explore?'),
        ...(Object.keys(MODE_INFO) as Mode[]).map(m => {
          const info = MODE_INFO[m];
          return h('button', { class: `mode-card ${p.mode === m ? 'on' : ''}`, onclick: () => { p.mode = m; stepMe(); } },
            h('span', { class: 'mode-emoji' }, info.emoji), h('strong', {}, info.title), h('span', {}, info.text));
        }),
        h('p', { class: 'hint' }, 'This can be switched any time with the 🧒 / 👨‍👧 button on the map. You can add more explorers later, each with their own finds.'),
        h('button', { class: 'text-btn', onclick: stepTier }, labelled('Back', 'back', 'before')),
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
        } }, labelled('Next', 'forward')),
        h('button', { class: 'text-btn', onclick: stepMode }, labelled('Back', 'back', 'before')),
      );
      root.scrollTop = 0;
    };

    const stepGo = () => {
      const g = activeGuide(p.guide) === 'scout' ? GUIDE_INFO.scout.name : guideName(p.guide, p.guideName);
      card.replaceChildren(
        buddySays(p.guide, { text: `Ready, ${p.name}? I am ${g}. Let's explore!`, pose: 'excited' }, { quiet: true, big: true }),
        h('p', { class: 'welcome-sub' }, 'The map needs to know where you are. Your phone will ask: tap "Allow".'),
        h('p', { class: 'hint' }, 'Your location, photos and voice notes stay on this device. Nothing is uploaded.'),
        h('button', { class: 'big-btn', onclick: () => { root.remove(); resolve(p); } }, "🚀 Let's explore!"),
        h('button', { class: 'text-btn', onclick: stepMe }, labelled('Back', 'back', 'before')),
      );
      root.scrollTop = 0;
      say(`Ready, ${p.name}? I am ${g}. Let's explore!`);
    };

    stepTier();
  });
}
