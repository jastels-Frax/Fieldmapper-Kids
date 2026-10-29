import { h, openSheet } from './ui.ts';
import { say } from './speech.ts';
import { buddySays } from './buddyView.ts';
import type { GuideId } from './types.ts';
import { TOOLS } from './railTools.ts';

/** "How to use": short parts, each one tap to open, with a part for grown-ups at the end. */
const PARTS: { emoji: string; title: string; lines: string[] }[] = [
  { emoji: '✨', title: 'Saving a find', lines: [
    'Tap "I found something!" at the bottom of the map.',
    'Take a photo, pick one from your photos, or draw it.',
    'Then say what it is: a plant, an animal, a mushroom, a lichen or a habitat (a place). Each one opens its kinds: a fern, a frog, a shelf mushroom, a crusty lichen, a wetland… Not sure? Tap ❓ Not sure.',
    'Tap ✨ Save now any time, or keep going: give it a name, its colours and size, and record voice notes.',
    'Hold your finger on the map to save a find right at that spot.',
  ] },
  { emoji: '📸', title: 'Quick finds', lines: [
    'Turn them on in 🔧 My buttons. Pick up to three kinds of things, or let Scout show the things you find most.',
    'They sit in a row above "I found something!".',
    'Tap one, take a photo, and it is saved where you are standing. Add more about it later in My Finds.',
  ] },
  { emoji: '📷', title: 'Photo spots', lines: [
    'Tap 📷 Photo on the map. Stand still, point your tablet at a view, and tap Take the picture.',
    'Scout reads the compass as you tap, so your map shows a camera dot with a wedge pointing the way you looked. Not right? Tap an arrow, or ? if you are not sure.',
    'Tap a photo spot on the map to see it. Come back another day, in another season, and tap 🔁 Take it again: then and now!',
    'Watch where you step while you aim, and stay where your grown-up can see you.',
  ] },
  { emoji: '✏️', title: 'Your drawings and paths', lines: [
    'Tap a line, a shape or a path on your map to see how long or how big it is.',
    'Give it a name, tap ✏️ Change it to move its dots (drag them), or 🗑️ Delete it.',
    'A path shows where you really walked, so it can be named but not changed.',
  ] },
  { emoji: '🗺️', title: 'The map buttons', lines: [
    ...TOOLS.map(t => `${t.emoji} ${t.word}: ${t.what}.`),
    'Choose your own buttons, and their order, in 🔧 My buttons. The arrow at the top folds them away.',
  ] },
  { emoji: '📖', title: 'My finds, badges and hunts', lines: [
    '📖 My Finds is your sticker book. Tap a find to see it, listen to it, or change it.',
    '🏅 Badges are earned by finding things. ⭐ at the top shows today\'s challenges.',
    '🔎 Hunts are scavenger hunts: find everything on the list to win a trophy.',
    "More than one explorer on this tablet? 🗺️ Map ▸ Everyone's finds puts their finds on your map too. Tap one to look at it; only its finder can change it.",
  ] },
  { emoji: '🐻', title: 'Staying safe', lines: [
    'Stay where your grown-up can see you, and stay with a grown-up near water.',
    'Look at mushrooms, but never eat one. Look at scat, but never touch it.',
    'Look at plants with your eyes: some, like poison ivy, make skin itchy.',
    'Watch wild animals from far away. Never touch or feed them.',
    'When you are done exploring, tap 🏠 Done for a tick check.',
  ] },
  { emoji: '🔒', title: 'For grown-ups', lines: [
    'Finds, photos, voice notes, paths and places stay on this device: no accounts, no uploads, no analytics.',
    'The map pictures come from the internet: the map services see roughly where the map is looking (around the explorer when the map follows them), as any web map does.',
    'Reading aloud uses the voices built into this device. Scout never uses an internet voice unless a grown-up picks one.',
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
