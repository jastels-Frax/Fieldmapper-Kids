/**
 * How Scout looks for one explorer: colours, buttons, text size, font and
 * motion. A small, kid-sized version of Field Mapper's App Style switches.
 * Each choice is one attribute on <html> (data-theme, data-buttons, data-text,
 * data-font, data-motion) whose CSS only re-points tokens, so every screen
 * follows. Stored on the Profile; absence of any field is the default. Pure.
 */
export type ThemeId = 'forest' | 'ocean' | 'sunset' | 'berry' | 'night' | 'snow';
export type ButtonStyleId = 'bubbly' | 'sticker' | 'flat' | 'blocky';
export type TextSizeId = 'normal' | 'big' | 'bigger';
export type FontId = 'rounded' | 'plain' | 'easy';
export type MotionId = 'lively' | 'calm';

export interface Look {
  theme: ThemeId;
  buttons: ButtonStyleId;
  text: TextSizeId;
  font: FontId;
  motion: MotionId;
}

export const DEFAULT_LOOK: Look = { theme: 'forest', buttons: 'bubbly', text: 'normal', font: 'rounded', motion: 'lively' };

export interface Choice<T extends string> {
  id: T;
  emoji: string;
  label: string;
  /** Said aloud and shown small under the label. */
  hint: string;
}

/** `swatch` is what the picker paints: [background, accent, highlight]. `bar` is the browser's theme colour. */
export const THEMES: (Choice<ThemeId> & { swatch: [string, string, string]; bar: string })[] = [
  { id: 'forest', emoji: '🌲', label: 'Forest', hint: 'Green and sunny', swatch: ['#fff9db', '#2f9e44', '#f76707'], bar: '#2f9e44' },
  { id: 'ocean', emoji: '🌊', label: 'Ocean', hint: 'Blue like the sea', swatch: ['#e7f5ff', '#1971c2', '#f59f00'], bar: '#1971c2' },
  { id: 'sunset', emoji: '🌅', label: 'Sunset', hint: 'Warm and glowing', swatch: ['#fff4e6', '#d9480f', '#d6336c'], bar: '#d9480f' },
  { id: 'berry', emoji: '🫐', label: 'Berry', hint: 'Purple and pink', swatch: ['#f3f0ff', '#6741d9', '#e64980'], bar: '#6741d9' },
  { id: 'night', emoji: '🌙', label: 'Night', hint: 'Dark, for evening', swatch: ['#16191d', '#40c057', '#fd7e14'], bar: '#16191d' },
  { id: 'snow', emoji: '❄️', label: 'Snow', hint: 'Extra clear to read', swatch: ['#ffffff', '#0b6b26', '#c2410c'], bar: '#0b6b26' },
];

export const BUTTON_STYLES: Choice<ButtonStyleId>[] = [
  { id: 'bubbly', emoji: '🫧', label: 'Bubbly', hint: 'Round and bouncy' },
  { id: 'sticker', emoji: '🏷️', label: 'Sticker', hint: 'Thick and bold' },
  { id: 'flat', emoji: '📄', label: 'Flat', hint: 'Smooth and simple' },
  { id: 'blocky', emoji: '🧱', label: 'Blocky', hint: 'Square corners' },
];

export const TEXT_SIZES: Choice<TextSizeId>[] = [
  { id: 'normal', emoji: '🔤', label: 'Normal', hint: 'Regular size' },
  { id: 'big', emoji: '🔠', label: 'Big', hint: 'A bit bigger' },
  { id: 'bigger', emoji: '🅰️', label: 'Biggest', hint: 'Easiest to see' },
];

export const FONTS: Choice<FontId>[] = [
  { id: 'rounded', emoji: '⚪', label: 'Round', hint: 'Soft round letters' },
  { id: 'plain', emoji: '✏️', label: 'Plain', hint: 'Like a book' },
  { id: 'easy', emoji: '👓', label: 'Easy read', hint: 'Wide, clear letters' },
];

export const MOTIONS: Choice<MotionId>[] = [
  { id: 'lively', emoji: '🎉', label: 'Lively', hint: 'Bounces and confetti' },
  { id: 'calm', emoji: '🍃', label: 'Calm', hint: 'Still and quiet' },
];

const ids = <T extends string>(list: Choice<T>[]) => list.map(c => c.id) as string[];
const pickOr = <T extends string>(v: unknown, list: Choice<T>[], d: T): T => (ids(list).includes(v as string) ? (v as T) : d);

/** Reads a stored look; anything missing or unknown (a newer build's id) falls back to the default. */
export function normalizeLook(raw: unknown): Look {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    theme: pickOr(r.theme, THEMES, DEFAULT_LOOK.theme),
    buttons: pickOr(r.buttons, BUTTON_STYLES, DEFAULT_LOOK.buttons),
    text: pickOr(r.text, TEXT_SIZES, DEFAULT_LOOK.text),
    font: pickOr(r.font, FONTS, DEFAULT_LOOK.font),
    motion: pickOr(r.motion, MOTIONS, DEFAULT_LOOK.motion),
  };
}

/** The attributes to stamp on <html>. */
export function lookAttributes(l: Look): Record<string, string> {
  return { theme: l.theme, buttons: l.buttons, text: l.text, font: l.font, motion: l.motion };
}

export function themeBar(t: ThemeId): string {
  return (THEMES.find(x => x.id === t) ?? THEMES[0]).bar;
}
