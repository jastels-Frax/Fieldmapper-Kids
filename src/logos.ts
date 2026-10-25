/**
 * Scout's logo, three ways, as our own constant SVG markup (the only kind that may go through innerHTML, as the
 * buddies do). The opening screen shows `logoFor(theme)`: the Field Notes label in the Field Journal look, the
 * Trail Badge otherwise. All three are kept so the choice can change without redrawing.
 */
export type LogoId = 'fieldnotes' | 'badge' | 'playful';

const SERIF = `'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif`;
const ROUND = `'Arial Rounded MT Bold','Nunito','Trebuchet MS',system-ui,sans-serif`;

/** A field-journal label from the "Scout the Survey Squirrel" storybook: cover-blue title, ink frame, fern sprigs. */
const FIELD_NOTES = `
<svg viewBox="0 0 360 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Scout field notes">
  <defs>
    <linearGradient id="lg-paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6ecd2"/><stop offset="1" stop-color="#e8d7ae"/></linearGradient>
  </defs>
  <rect x="14" y="14" width="332" height="172" rx="18" fill="url(#lg-paper)" stroke="#4a3826" stroke-width="4"/>
  <rect x="24" y="24" width="312" height="152" rx="12" fill="none" stroke="#4a3826" stroke-width="1.5" stroke-dasharray="5 4"/>
  <g fill="none" stroke="#5e6d38" stroke-width="2.4" stroke-linecap="round">
    <path d="M44 150 C 60 120, 62 92, 52 62"/>
    <path d="M51 132 l-12 -6 M53 116 l-13 -4 M54 100 l-12 -2 M54 84 l-11 0 M52 70 l-9 2"/>
    <path d="M51 132 l11 -8 M53 116 l12 -7 M54 100 l12 -6 M54 84 l10 -5 M52 70 l8 -5"/>
    <path d="M316 150 C 300 120, 298 92, 308 62"/>
    <path d="M309 132 l12 -6 M307 116 l13 -4 M306 100 l12 -2 M306 84 l11 0 M308 70 l9 2"/>
    <path d="M309 132 l-11 -8 M307 116 l-12 -7 M306 100 l-12 -6 M306 84 l-10 -5 M308 70 l-8 -5"/>
  </g>
  <text x="180" y="62" text-anchor="middle" font-family="${SERIF}" font-size="15" letter-spacing="4" fill="#7a4b26">FIELD NOTES</text>
  <text x="180" y="122" text-anchor="middle" font-family="${SERIF}" font-size="64" font-weight="700" fill="#2c4f8a">Scout</text>
  <path d="M110 136 Q 180 128 250 136" fill="none" stroke="#c4652a" stroke-width="3" stroke-linecap="round"/>
  <text x="180" y="160" text-anchor="middle" font-family="${SERIF}" font-size="14" font-style="italic" fill="#4a3826">explore · notice · discover</text>
</svg>`;

/** A sew-on explorer patch: stitched edge, hills and pines, a compass star. */
const BADGE = `
<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Scout explorer badge">
  <circle cx="110" cy="110" r="104" fill="#2f6b3a"/>
  <circle cx="110" cy="110" r="96" fill="none" stroke="#f4e6c1" stroke-width="3" stroke-dasharray="6 5"/>
  <clipPath id="lg-scene"><circle cx="110" cy="110" r="72"/></clipPath>
  <g clip-path="url(#lg-scene)">
    <rect x="30" y="30" width="160" height="160" fill="#cfe8f7"/>
    <path d="M30 132 Q 72 96 110 126 Q 148 96 190 132 L190 190 L30 190 Z" fill="#4f9a4a"/>
    <path d="M58 150 l12 -34 l12 34 Z M82 150 l10 -26 l10 26 Z M128 150 l12 -34 l12 34 Z" fill="#245a2e"/>
    <circle cx="148" cy="74" r="13" fill="#ffd43b"/>
    <path d="M110 52 l6 16 l16 6 l-16 6 l-6 16 l-6 -16 l-16 -6 l16 -6 Z" fill="#e8590c" stroke="#fff" stroke-width="2"/>
  </g>
  <circle cx="110" cy="110" r="72" fill="none" stroke="#f4e6c1" stroke-width="3"/>
  <path id="lg-arc" d="M30 110 A 80 80 0 0 1 190 110" fill="none"/>
  <text font-family="${ROUND}" font-size="30" font-weight="900" letter-spacing="6" fill="#f4e6c1"><textPath href="#lg-arc" startOffset="50%" text-anchor="middle">SCOUT</textPath></text>
  <text x="110" y="196" text-anchor="middle" font-family="${ROUND}" font-size="12" font-weight="800" letter-spacing="2" fill="#f4e6c1">EXPLORER</text>
</svg>`;

/** A chunky, friendly wordmark: the "o" is a magnifying glass, with footprints after it. */
const PLAYFUL = `
<svg viewBox="0 0 360 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Scout">
  <g font-family="${ROUND}" font-size="92" font-weight="900" fill="#e8590c" stroke="#4a3826" stroke-width="5" paint-order="stroke">
    <text x="20" y="108">Sc</text><text x="196" y="108">ut</text>
  </g>
  <circle cx="160" cy="76" r="27" fill="#d0ebff" stroke="#4a3826" stroke-width="8"/>
  <circle cx="160" cy="76" r="27" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="18 200" transform="rotate(200 160 76)"/>
  <path d="M180 97 l18 20" stroke="#4a3826" stroke-width="12" stroke-linecap="round"/>
  <g fill="#5e6d38"><ellipse cx="300" cy="134" rx="7" ry="10"/><ellipse cx="322" cy="122" rx="7" ry="10"/><ellipse cx="344" cy="134" rx="7" ry="10"/></g>
</svg>`;

export const LOGOS: Record<LogoId, { label: string; svg: string }> = {
  fieldnotes: { label: 'Field Notes', svg: FIELD_NOTES },
  badge: { label: 'Trail Badge', svg: BADGE },
  playful: { label: 'Playful', svg: PLAYFUL },
};

/** The logo the opening screen shows for a look. */
export function logoFor(theme: string): LogoId {
  return theme === 'journal' ? 'fieldnotes' : 'badge';
}
