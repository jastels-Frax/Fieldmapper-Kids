/**
 * How Scout looks for one explorer. A kid-sized version of Field Mapper's App
 * Style switches, with more to play with: colours, buttons, background,
 * header, map pins, celebrations, text size, letters and motion. Each choice
 * (but the celebration, which confetti.ts reads) is one data- attribute on
 * <html> whose CSS only re-points tokens, so every screen follows. The picker
 * previews a choice by putting the same tokens on a small sample. Stored on
 * the Profile; absence of any field is the default. Pure.
 */
export type ThemeId = 'journal' | 'forest' | 'ocean' | 'sunset' | 'berry' | 'candy' | 'autumn' | 'jungle' | 'night' | 'space' | 'snow';
export type ButtonStyleId = 'bubbly' | 'sticker' | 'flat' | 'jelly' | 'outline' | 'pixel' | 'pop';
export type PatternId = 'plain' | 'dots' | 'stripes' | 'grid' | 'waves' | 'stars' | 'leaves';
export type HeaderId = 'solid' | 'rainbow' | 'stripes' | 'soft';
export type PinId = 'drop' | 'bubble' | 'square';
export type PartyId = 'confetti' | 'stars' | 'leaves' | 'bubbles';
export type TextSizeId = 'normal' | 'big' | 'bigger';
export type FontId = 'rounded' | 'plain' | 'easy' | 'handwritten' | 'chunky' | 'storybook';
export type MotionId = 'lively' | 'calm';

export interface Look {
  theme: ThemeId;
  buttons: ButtonStyleId;
  pattern: PatternId;
  header: HeaderId;
  pins: PinId;
  party: PartyId;
  text: TextSizeId;
  font: FontId;
  motion: MotionId;
}

export const DEFAULT_LOOK: Look = {
  theme: 'forest', buttons: 'bubbly', pattern: 'plain', header: 'solid', pins: 'drop', party: 'confetti',
  text: 'normal', font: 'rounded', motion: 'lively',
};

export interface Choice<T extends string> {
  id: T;
  emoji: string;
  label: string;
  /** Said aloud and shown small under the label. */
  hint: string;
}

/**
 * `swatch` is what the picker paints: [background, accent, highlight]. `bar` is the browser's theme colour.
 * `art` marks a theme that is a whole look rather than a palette (the picker shows its picture, and
 * `suggestedFont` is offered with it).
 */
export const THEMES: (Choice<ThemeId> & { swatch: [string, string, string]; bar: string; dark?: boolean; art?: boolean; suggestedFont?: FontId })[] = [
  { id: 'journal', emoji: '📜', label: 'Field Journal', hint: 'Like a storybook, on old paper', swatch: ['#ecdfbf', '#5e6d38', '#c4652a'], bar: '#4a3826', art: true, suggestedFont: 'storybook' },
  { id: 'forest', emoji: '🌲', label: 'Forest', hint: 'Green and sunny', swatch: ['#fff9db', '#2f9e44', '#f76707'], bar: '#2f9e44' },
  { id: 'ocean', emoji: '🌊', label: 'Ocean', hint: 'Blue like the sea', swatch: ['#e7f5ff', '#1971c2', '#f59f00'], bar: '#1971c2' },
  { id: 'sunset', emoji: '🌅', label: 'Sunset', hint: 'Warm and glowing', swatch: ['#fff4e6', '#d9480f', '#d6336c'], bar: '#d9480f' },
  { id: 'berry', emoji: '🫐', label: 'Berry', hint: 'Purple and pink', swatch: ['#f3f0ff', '#6741d9', '#e64980'], bar: '#6741d9' },
  { id: 'candy', emoji: '🍭', label: 'Candy', hint: 'Pink and minty', swatch: ['#fff0f6', '#d6336c', '#0ca678'], bar: '#d6336c' },
  { id: 'autumn', emoji: '🍂', label: 'Autumn', hint: 'Rusty and golden', swatch: ['#fdf3e7', '#a0522d', '#e8a317'], bar: '#a0522d' },
  { id: 'jungle', emoji: '🦜', label: 'Jungle', hint: 'Deep green and lime', swatch: ['#ebfbee', '#087f5b', '#94d82d'], bar: '#087f5b' },
  { id: 'night', emoji: '🌙', label: 'Night', hint: 'Dark, for evening', swatch: ['#16191d', '#40c057', '#fd7e14'], bar: '#16191d', dark: true },
  { id: 'space', emoji: '🚀', label: 'Space', hint: 'Dark with glowing colours', swatch: ['#14112b', '#9775fa', '#22b8cf'], bar: '#14112b', dark: true },
  { id: 'snow', emoji: '❄️', label: 'Snow', hint: 'Extra clear to read', swatch: ['#ffffff', '#0b6b26', '#c2410c'], bar: '#0b6b26' },
];

export const BUTTON_STYLES: Choice<ButtonStyleId>[] = [
  { id: 'bubbly', emoji: '🫧', label: 'Bubbly', hint: 'Round with a bold edge' },
  { id: 'sticker', emoji: '🏷️', label: 'Sticker', hint: 'Thick, with a white ring' },
  { id: 'flat', emoji: '📄', label: 'Flat', hint: 'No lines, just colour' },
  { id: 'jelly', emoji: '🍬', label: 'Jelly', hint: 'Shiny and squishy' },
  { id: 'outline', emoji: '⭕', label: 'Outline', hint: 'See-through, coloured edges' },
  { id: 'pixel', emoji: '👾', label: 'Pixel', hint: 'Square, like a video game' },
  { id: 'pop', emoji: '💥', label: 'Pop', hint: 'Bright shadows, like a comic' },
];

export const PATTERNS: Choice<PatternId>[] = [
  { id: 'plain', emoji: '⬜', label: 'Plain', hint: 'Nothing behind' },
  { id: 'dots', emoji: '🔵', label: 'Dots', hint: 'Polka dots' },
  { id: 'stripes', emoji: '🦓', label: 'Stripes', hint: 'Slanted stripes' },
  { id: 'grid', emoji: '📐', label: 'Grid', hint: 'Like graph paper' },
  { id: 'waves', emoji: '🌊', label: 'Waves', hint: 'Wavy lines' },
  { id: 'stars', emoji: '✨', label: 'Stars', hint: 'Little stars' },
  { id: 'leaves', emoji: '🍃', label: 'Leaves', hint: 'Falling leaves' },
];

export const HEADERS: Choice<HeaderId>[] = [
  { id: 'solid', emoji: '🟩', label: 'Solid', hint: 'One bright colour' },
  { id: 'rainbow', emoji: '🌈', label: 'Blend', hint: 'Two colours blending' },
  { id: 'stripes', emoji: '🚧', label: 'Striped', hint: 'Bold stripes' },
  { id: 'soft', emoji: '☁️', label: 'Soft', hint: 'Light and gentle' },
];

export const PINS: Choice<PinId>[] = [
  { id: 'drop', emoji: '📍', label: 'Drop', hint: 'A classic map pin' },
  { id: 'bubble', emoji: '🟢', label: 'Bubble', hint: 'Round circles' },
  { id: 'square', emoji: '🟪', label: 'Tile', hint: 'Little square tiles' },
];

export const PARTIES: (Choice<PartyId> & { pieces: string[] })[] = [
  { id: 'confetti', emoji: '🎉', label: 'Confetti', hint: 'Paper confetti', pieces: [] },
  { id: 'stars', emoji: '⭐', label: 'Stars', hint: 'Sparkly stars', pieces: ['⭐', '✨', '🌟'] },
  { id: 'leaves', emoji: '🍁', label: 'Leaves', hint: 'A swirl of leaves', pieces: ['🍁', '🍂', '🍃'] },
  { id: 'bubbles', emoji: '🫧', label: 'Bubbles', hint: 'Floating bubbles', pieces: [] },
];

export const TEXT_SIZES: Choice<TextSizeId>[] = [
  { id: 'normal', emoji: '🔤', label: 'Normal', hint: 'Regular size' },
  { id: 'big', emoji: '🔠', label: 'Big', hint: 'A bit bigger' },
  { id: 'bigger', emoji: '🅰️', label: 'Biggest', hint: 'Easiest to see' },
];

/** The font stacks, restated here so the picker can show each one (the CSS LOOKS block holds the same). */
export const FONT_STACKS: Record<FontId, string> = {
  rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", "Segoe UI Rounded", "Segoe UI", system-ui, sans-serif',
  plain: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  easy: 'Verdana, "Atkinson Hyperlegible", Tahoma, "Trebuchet MS", system-ui, sans-serif',
  handwritten: '"Chalkboard SE", "Comic Sans MS", "Comic Neue", "Marker Felt", "Segoe Print", cursive',
  chunky: '"Arial Rounded MT Bold", "Arial Black", "Helvetica Neue", Impact, system-ui, sans-serif',
  storybook: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Times New Roman", serif',
};

export const FONTS: Choice<FontId>[] = [
  { id: 'rounded', emoji: '⚪', label: 'Round', hint: 'Soft round letters' },
  { id: 'plain', emoji: '✏️', label: 'Plain', hint: 'Like a book' },
  { id: 'easy', emoji: '👓', label: 'Easy read', hint: 'Wide, clear letters' },
  { id: 'handwritten', emoji: '🖍️', label: 'Handwritten', hint: 'Like a crayon' },
  { id: 'chunky', emoji: '🧱', label: 'Chunky', hint: 'Big and bold' },
  { id: 'storybook', emoji: '📖', label: 'Storybook', hint: 'Like an old book' },
];

export const MOTIONS: Choice<MotionId>[] = [
  { id: 'lively', emoji: '🎉', label: 'Lively', hint: 'Bounces and celebrations' },
  { id: 'calm', emoji: '🍃', label: 'Calm', hint: 'Still and quiet' },
];

/** Every switch the picker shows, in the order it shows them. */
export const LOOK_KEYS = ['theme', 'buttons', 'pattern', 'header', 'pins', 'party', 'text', 'font', 'motion'] as const;

const CHOICES: { [K in keyof Look]: Choice<Look[K]>[] } = {
  theme: THEMES, buttons: BUTTON_STYLES, pattern: PATTERNS, header: HEADERS, pins: PINS, party: PARTIES,
  text: TEXT_SIZES, font: FONTS, motion: MOTIONS,
};

export function choicesFor<K extends keyof Look>(k: K): Choice<Look[K]>[] {
  return CHOICES[k];
}

const pickOr = <T extends string>(v: unknown, list: Choice<T>[], d: T): T => (list.some(c => c.id === v) ? (v as T) : d);

/** Reads a stored look; anything missing or unknown (a newer build's id) falls back to the default. */
export function normalizeLook(raw: unknown): Look {
  const r = { ...(raw && typeof raw === 'object' ? raw : {}) } as Record<string, unknown>;
  // Withdrawn ids fold onto their nearest successor, for ever: they sit in stored profiles.
  if (r.buttons === 'blocky') r.buttons = 'pixel';
  const out = {} as Record<keyof Look, string>;
  for (const k of LOOK_KEYS) out[k] = pickOr(r[k], CHOICES[k] as Choice<string>[], DEFAULT_LOOK[k]);
  return out as unknown as Look;
}

/** The attributes to stamp on <html>: everything but the celebration, which is not CSS. */
export function lookAttributes(l: Look): Record<string, string> {
  const { party, ...rest } = l;
  void party;
  return { ...rest };
}

export function partyPieces(p: PartyId): string[] {
  return PARTIES.find(x => x.id === p)?.pieces ?? [];
}

/**
 * Choosing a theme. A whole-look theme brings its own letters along, but only over the default ones: an
 * explorer who chose letters (Easy read above all) keeps them.
 */
export function withTheme(l: Look, theme: ThemeId): Look {
  const t = THEMES.find(x => x.id === theme);
  const font = t?.suggestedFont && l.font === DEFAULT_LOOK.font ? t.suggestedFont : l.font;
  return { ...l, theme, font };
}

export function themeBar(t: ThemeId): string {
  return (THEMES.find(x => x.id === t) ?? THEMES[0]).bar;
}

/** One of everything, at random — "Surprise me!". Text size and motion are left as they were: those are needs, not fun. */
export function surpriseLook(current: Look, rand: () => number = Math.random): Look {
  const any = <T extends string>(list: Choice<T>[], not: T): T => {
    const pool = list.filter(c => c.id !== not);
    return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))].id;
  };
  return {
    ...current,
    theme: any(THEMES, current.theme),
    buttons: any(BUTTON_STYLES, current.buttons),
    pattern: any(PATTERNS, current.pattern),
    header: any(HEADERS, current.header),
    pins: any(PINS, current.pins),
    party: any(PARTIES, current.party),
    font: any(FONTS, current.font),
  };
}
