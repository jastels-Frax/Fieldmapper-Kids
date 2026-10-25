import { h, openSheet } from './ui.ts';
import { say } from './speech.ts';
import { buddySays } from './buddyView.ts';
import type { GuideId } from './types.ts';
import { TOOLS } from './railTools.ts';

/** "How to use": short parts, each one tap to open, with a part for grown-ups at the end. */
const PARTS: { emoji: string; title: string; lines: string[] }[] = [
  { emoji: '✨', title: 'Saving a find', lines: [
    'Tap "I found something!" at the bottom of the map.',
    'Take a photo, pick one from your photos, or draw it. Then say what it is.',
    'Tap ✨ Save now any time, or keep going: give it a name, its colours and size, and record voice notes.',
    'Hold your finger on the map to save a find right at that spot.',
  ] },
  { emoji: '📸', title: 'Quick finds', lines: [
    'The small buttons above "I found something!" are the things you find most.',
    'Tap one, take a photo, and it is saved where you are standing. Add more about it later in My Finds.',
  ] },
  { emoji: '🗺️', title: 'The map buttons', lines: [
    ...TOOLS.map(t => `${t.emoji} ${t.word}: ${t.what}.`),
    'Choose your own buttons, and their order, in 🔧 My buttons. The arrow at the top folds them away.',
  ] },
  { emoji: '📖', title: 'My finds, badges and hunts', lines: [
    '📖 My Finds is your sticker book. Tap a find to see it, listen to it, or change it.',
    '🏅 Badges are earned by finding things. ⭐ at the top shows today\'s challenges.',
    '🔎 Hunts are scavenger hunts: find everything on the list to win a trophy.',
  ] },
  { emoji: '🐻', title: 'Staying safe', lines: [
    'Stay where your grown-up can see you.',
    'Look at mushrooms, but never eat one. Look at scat, but never touch it.',
    'When you are done exploring, tap 🏠 Done for a tick check.',
  ] },
  { emoji: '🔒', title: 'For grown-ups', lines: [
    'Everything stays on this device: no accounts, no uploads, no tracking. Only the map pictures come from the internet.',
    'The 🔒 grown-up corner has the settings, the explorers, reading aloud, species lists, saving all finds to a file, and deleting.',
    'Scout works offline once it has been opened online. The map shows the places already looked at with a signal.',
    'On an iPhone or iPad, add Scout to the Home Screen so its data is kept.',
    'Together mode shows exact places and relaxes the locks: use it when you are beside the explorer.',
  ] },
];

export function openHelp(guide: GuideId): void {
  const { body } = openSheet({ title: 'How to use Scout', emoji: '❓', className: 'help' });
  body.append(buddySays(guide, { text: 'Tap a part to read about it!', pose: 'point' }));
  for (const part of PARTS) {
    const d = h('details', { class: 'help-part' },
      h('summary', {}, h('span', { class: 'help-emoji', 'aria-hidden': 'true' }, part.emoji), part.title),
      h('ul', {}, ...part.lines.map(l => h('li', {}, l))));
    d.addEventListener('toggle', () => { if (d.open) say(`${part.title}. ${part.lines.join(' ')}`); });
    body.append(d);
  }
}
