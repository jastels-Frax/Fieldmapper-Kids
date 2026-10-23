/**
 * The tick check: where a child looks (with a grown-up), and the grown-ups'
 * how-to. The guidance follows the US CDC and Health Canada advice on ticks;
 * it is general information, not medical advice, and says so on screen.
 */
export interface TickSpot {
  id: string;
  emoji: string;
  /** Said to the child. */
  text: string;
}

export const TICK_SPOTS: TickSpot[] = [
  { id: 'head', emoji: '💇', text: 'In your hair' },
  { id: 'ears', emoji: '👂', text: 'In and behind your ears' },
  { id: 'neck', emoji: '🧣', text: 'Around your neck' },
  { id: 'arms', emoji: '💪', text: 'Under your arms' },
  { id: 'belly', emoji: '🫃', text: 'In your belly button' },
  { id: 'waist', emoji: '👖', text: 'Around your waist' },
  { id: 'knees', emoji: '🦵', text: 'Behind your knees' },
  { id: 'legs', emoji: '🩳', text: 'Between your legs' },
  { id: 'toes', emoji: '🦶', text: 'Between your toes' },
  { id: 'clothes', emoji: '👕', text: 'Your clothes and bag' },
];

/** Optional: not every family has one, so it never blocks "all clear". */
export const PET_SPOT: TickSpot = { id: 'pet', emoji: '🐕', text: 'Your pet, if one came along' };

export interface GuideSection {
  emoji: string;
  title: string;
  points: string[];
}

export const TICK_GUIDE: GuideSection[] = [
  {
    emoji: '🔍', title: 'What to look for',
    points: [
      'Ticks are small and dark, with eight legs. Before they feed, adults are about the size of a sesame seed; young ticks (nymphs) can be as small as a poppy seed.',
      'A tick that has been feeding is bigger, rounder and often grey.',
      'They like warm, hidden places: the hairline, ears, neck, armpits, belly button, waist, groin, behind the knees and between the toes.',
    ],
  },
  {
    emoji: '🏠', title: 'When you come inside',
    points: [
      'Check the whole body, including the scalp, using your hands as well as your eyes. A mirror helps for the back.',
      'A bath or shower within two hours of coming indoors helps wash off ticks that have not attached, and is a good time to check.',
      'Ticks ride in on clothes, bags and pets. Tumble-dry dry clothes on high heat for 10 minutes to kill ticks on them; washed clothes need longer in the dryer.',
      'Check pets before they come in, especially around the ears, neck and between the toes.',
    ],
  },
  {
    emoji: '🪛', title: 'Found one attached?',
    points: [
      'Stay calm, and do not squeeze or crush it with your fingers.',
      'Use clean, fine-tipped tweezers. Grip the tick as close to the skin as you can.',
      'Pull straight up with steady, even pressure. Do not twist or jerk.',
      'If part of the mouth stays in the skin, try to lift it out with the tweezers. If you cannot, leave it and let the skin heal.',
      'Clean the bite and your hands with rubbing alcohol or soap and water.',
      'Do not use nail polish, petroleum jelly or heat to make it let go; remove it with tweezers as soon as you can.',
      'Put the tick in a sealed bag or container (or stick it to tape), and note the date and where on the body it was. A photo helps if you need to see someone.',
    ],
  },
  {
    emoji: '🩺', title: 'When to get help',
    points: [
      'Some ticks carry illnesses such as Lyme disease.',
      'Watch the bite for the next few weeks. Contact a doctor, nurse or pharmacist (or your health line, 811 in most of Canada) if a red rash appears, especially one that grows or looks like a bullseye, or if there is a fever, headache, tiredness or sore joints or muscles.',
      'Mention the tick bite and the date it happened.',
    ],
  },
  {
    emoji: '🛡️', title: 'Next time',
    points: [
      'Wear long sleeves and long pants, with pants tucked into socks. Light colours make ticks easier to spot.',
      'Walk in the middle of trails and avoid long grass and leaf litter where you can.',
      'A grown-up can apply an insect repellent approved for ticks (for example one with DEET or icaridin), following the label\'s rules for children\'s ages.',
    ],
  },
];

export const GUIDE_DISCLAIMER = 'General information only, not medical advice. If you are worried about a bite, ask a health professional.';

/** True when every required spot has been checked (the pet never blocks). */
export function allClear(checked: Set<string>): boolean {
  return TICK_SPOTS.every(s => checked.has(s.id));
}

/** Keeps the record of checks bounded: the newest `keep`. */
export function recordCheck(history: string[] | undefined, at: string, keep = 100): string[] {
  return [...(history ?? []), at].slice(-keep);
}
