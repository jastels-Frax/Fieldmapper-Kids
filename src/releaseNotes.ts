/**
 * Scout's versions, newest first: what each one brought, in words for the family (CHANGELOG.md has the detail).
 * The newest entry is the version package.json carries — a test holds the two together, so a release cannot ship
 * with the app saying an old number. Pure.
 */
export interface Release {
  version: string;
  date: string;
  title: string;
  notes: string[];
}

export const RELEASES: Release[] = [
  {
    version: '2.4.1', date: '2026-10-28', title: 'Tidier photo spots',
    notes: ['Photo spots get smaller as you zoom out, so they no longer cover the map.'],
  },
  {
    version: '2.4.0', date: '2026-10-28', title: 'Photo spots',
    notes: [
      'Tap 📷 Photo to take a picture of a view. Your map shows which way you looked.',
      'Come back another day and take it again: then and now!',
      'Two new badges: Photo Spotter and Then and Now.',
    ],
  },
  {
    version: '2.3.1', date: '2026-10-28', title: 'A steadier map',
    notes: ['The map loads the same way on every kind of web host.'],
  },
  {
    version: '2.3.0', date: '2026-10-28', title: 'Safer for explorers',
    notes: [
      'Reading aloud only uses voices on this device.',
      'A grown-up is asked before a saved photo or voice note is removed.',
      'Scout works with the tablet or phone held sideways.',
    ],
  },
  {
    version: '2.2.0', date: '2026-10-28', title: 'Tap your drawings',
    notes: [
      'Tap a line, shape or path on your map to see how long or big it is.',
      'Name it, change it by dragging its dots, or delete it.',
    ],
  },
  {
    version: '2.1.3', date: '2026-10-28', title: 'Tidier on a computer',
    notes: [
      'Scout\'s own arrows and close buttons.',
      'On a computer, every screen stays in one tidy column.',
    ],
  },
  {
    version: '2.1.2', date: '2026-10-28', title: 'Easier to move through a find',
    notes: [
      'Go back and forward through a find with the arrows at the top.',
      'Writing boxes are easier to spot in the Field Journal look.',
    ],
  },
  {
    version: '2.1.1', date: '2026-10-25', title: 'More room for finding',
    notes: [
      'The find steps have a slimmer top, so the buttons come first.',
      'The storybook pictures show Scout\'s whole face.',
    ],
  },
  {
    version: '2.1.0', date: '2026-10-25', title: 'Your own quick finds',
    notes: [
      'Quick finds are off until you turn them on in My buttons.',
      'Pick up to three kinds of things for your quick-find buttons.',
      'Words now stay inside their buttons.',
    ],
  },
  {
    version: '2.0.0', date: '2026-10-25', title: 'Scout 2.0',
    notes: [
      'A new opening screen: pick who is exploring, then Start adventure.',
      'Draw lines and shapes on your map, and measure how far and how big.',
      'Choose your own map buttons in My buttons.',
      'Storybook pictures for your card, and a different picture on the map if you like.',
      'A How to use guide.',
    ],
  },
  {
    version: '1.2.0', date: '2026-10-25', title: 'Quicker finds',
    notes: [
      'Save a find straight after picking what it is.',
      'Quick-find buttons: one tap, one photo, saved.',
      'Type your own name for what you found.',
      'Record as many voice notes as you like.',
      'Path only tracks when you turn it on.',
    ],
  },
  {
    version: '1.1.0', date: '2026-10-24', title: 'The Field Journal',
    notes: [
      'The storybook look, with Scout the Survey Squirrel as your guide.',
      'Mushrooms, and an arrow that shows which way you face.',
      'Hold your finger on the map to put a find right there.',
      'Every character has a voice of their own.',
    ],
  },
  {
    version: '1.0.0', date: '2026-10-23', title: 'Scout',
    notes: [
      'Save finds on a map with photos, drawings and voice notes.',
      'Badges, challenges and scavenger hunts.',
      'Explorers with their own guide, look and finds.',
      'Record the path you walk, and do a tick check at the end.',
    ],
  },
];

export const CURRENT = RELEASES[0];
