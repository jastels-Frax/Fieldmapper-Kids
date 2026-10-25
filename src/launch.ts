import type { Profile } from './types.ts';
import { h, openSheet } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { guideFigure, buddySays, nameOf } from './buddyView.ts';
import { activeGuide, GUIDES } from './guides.ts';
import { profileFace } from './profiles.ts';
import { LOGOS, logoFor } from './logos.ts';
import { normalizeLook } from './look.ts';
import { CURRENT, RELEASES } from './releaseNotes.ts';

export interface LaunchHost {
  profiles: () => Profile[];
  active: () => Profile;
  switchTo: (id: string) => Promise<void>;
  addExplorer: () => void;
  openFinds: () => void;
  openBadges: () => void;
  openLook: () => void;
  openButtons: () => void;
  openHelp: () => void;
  openGrownUps: () => void;
}

/**
 * The opening screen: shown when Scout is opened (each page load), never when the explorer comes back to it from
 * another app — a returning explorer was in the middle of something. A logo, the guide and the crew welcoming the
 * explorer by name, who's exploring, 🚀 Start adventure, and everything else one tap away. Resolves when the
 * explorer starts.
 */
export function openLaunch(host: LaunchHost): Promise<void> {
  return new Promise(resolve => {
    const root = h('div', { class: 'launch', role: 'dialog', 'aria-label': 'Scout' });
    const paint = () => {
      const me = host.active();
      const guide = activeGuide(me.guide);
      const logo = h('div', { class: 'launch-logo' });
      logo.innerHTML = LOGOS[logoFor(normalizeLook(me.look).theme)].svg;
      // The guide in front, a few of the crew peeking in behind (never the guide twice).
      const crew = GUIDES.filter(g => g !== me.guide).slice(0, 3);
      const welcome = h('div', { class: 'launch-welcome' },
        h('div', { class: 'launch-crew', 'aria-hidden': 'true' }, ...crew.map(g => guideFigure(g, 'hello', 'buddy-fig launch-peek'))),
        buddySays(guide, { text: me.name ? `Welcome back, ${me.name}! Ready for an adventure?` : 'Welcome, explorer! Ready for an adventure?', pose: 'excited' }, { quiet: true }));
      const people = host.profiles();
      const who = h('div', { class: 'launch-who' },
        ...people.map(p => h('button', {
          class: `launch-person ${p.id === me.id ? 'on' : ''}`, 'aria-pressed': String(p.id === me.id),
          onclick: async () => {
            if (p.id === me.id) return;
            sounds.pick();
            await host.switchTo(p.id);
            say(`Hi ${p.name || 'explorer'}!`);
            paint();
          },
        }, profileFace(p, 'face launch-face'), h('strong', {}, p.name || 'Explorer'))),
        h('button', { class: 'launch-person add', onclick: () => host.addExplorer() }, h('span', { class: 'face launch-face face-emoji' }, '➕'), h('strong', {}, 'Add')));
      const tile = (emoji: string, word: string, fn: () => void) =>
        h('button', { class: 'launch-tile', onclick: () => { sounds.tap(); fn(); } }, h('span', { class: 'launch-tile-emoji', 'aria-hidden': 'true' }, emoji), word);
      root.replaceChildren(h('div', { class: 'launch-inner' },
        logo,
        welcome,
        h('h2', { class: 'launch-h' }, "Who's exploring?"),
        who,
        h('button', { class: 'big-btn launch-go', onclick: start }, '🚀 Start adventure'),
        h('div', { class: 'launch-tiles' },
          tile('📖', 'My finds', host.openFinds),
          tile('🏅', 'Badges', host.openBadges),
          tile('🎨', 'My look', host.openLook),
          tile('🔧', 'My buttons', host.openButtons),
          tile('❓', 'How to use', host.openHelp),
          tile('🔒', 'Grown-ups', host.openGrownUps)),
        h('button', { class: 'text-btn launch-version', onclick: () => openWhatsNew(me) }, `Scout ${CURRENT.version} · ✨ What's new`),
      ));
    };
    const start = () => {
      sounds.save();
      root.classList.add('leaving');
      window.removeEventListener('scout-profiles-changed', paint);
      setTimeout(() => root.remove(), 260);
      resolve();
    };
    // Explorers added, renamed or restyled from a screen opened here show at once.
    window.addEventListener('scout-profiles-changed', paint);
    paint();
    document.body.append(root);
    say(`Welcome to Scout! ${nameOf(activeGuide(host.active().guide))} is ready to explore.`);
  });
}

/** Every version, newest first, in the family's words. */
export function openWhatsNew(me: Profile): void {
  const { body } = openSheet({ title: "What's new", emoji: '✨', className: 'help' });
  body.append(buddySays(me.guide, { text: `This is Scout ${CURRENT.version}! Here is what's new.`, pose: 'excited' }));
  for (const r of RELEASES) {
    body.append(h('div', { class: 'help-part release' },
      h('h3', {}, `${r.title} · ${r.version}`), h('p', { class: 'hint' }, r.date),
      h('ul', {}, ...r.notes.map(n => h('li', {}, n)))));
  }
}
