/**
 * The woodland crew, drawn in Pip and Hop's style (bold black line, glossy
 * eyes, white sticker rim) but in their own colours. Each one looks after a
 * part of the app (see cast.ts). Pure strings, no DOM.
 */
import {
  EXPRESSIONS, INK, WHITE, MOUTH, TONGUE, QUESTION,
  path, stroke, ellipse, limb, eye, openHand, fist, pointing, stickerSvg,
  type Expression, type Gaze,
} from './buddies.ts';

export type Critter = 'fox' | 'moose' | 'bear' | 'owl' | 'squirrel' | 'raccoon';
export const CRITTERS: Critter[] = ['fox', 'moose', 'bear', 'owl', 'squirrel', 'raccoon'];

/** Arms over one body, shared by the crew: the pose is carried by the arms, eyes and mouth. */
function arms(e: Expression, fur: string, hand: string): string {
  const downL = limb('M92,180 q-14,22 -2,38', fur) + fist(92, 220, hand);
  const downR = limb('M164,180 q14,22 2,38', fur) + fist(164, 220, hand);
  switch (e) {
    case 'hello': return downL + limb('M166,180 q24,-14 28,-48', fur) + openHand(196, 128, 12, hand);
    case 'point': return downL + limb('M166,184 q24,-4 42,-18', fur) + pointing(210, 164, hand);
    case 'think': case 'confused': return downL + limb('M166,186 q12,-24 -18,-34', fur) + fist(146, 154, hand);
    case 'excited': return limb('M90,180 q-22,-12 -26,-46', fur) + limb('M166,180 q22,-12 26,-46', fur) + openHand(62, 130, -14, hand) + openHand(194, 130, 14, hand);
    case 'success': return limb('M90,182 q-28,-2 -30,-38', fur) + limb('M166,182 q28,-2 30,-38', fur) + fist(60, 140, hand) + fist(196, 140, hand);
    default: return downL + downR;
  }
}

function mouth(e: Expression, y: number, w = 14): string {
  const open = (ww: number, hh: number) => path(`M${128 - ww},${y} q${ww},${hh} ${ww * 2},0 q-${ww},${hh * 0.35} -${ww * 2},0 z`, MOUTH, 3.5)
    + `<ellipse cx="128" cy="${y + hh * 0.5}" rx="${ww * 0.5}" ry="${hh * 0.16}" fill="${TONGUE}"/>`;
  switch (e) {
    case 'hello': case 'point': case 'wink': return open(w, w * 1.6);
    case 'excited': case 'success': return open(w * 1.25, w * 2.3);
    case 'think': return stroke(`M120,${y + 6} q8,-3 16,0`, INK, 3.5);
    case 'confused': return stroke(`M118,${y + 6} q5,-5 10,0 q5,5 10,0`, INK, 3.5);
    default: return stroke(`M116,${y} q12,12 24,0`, INK, 4);
  }
}

function eyes(e: Expression, lx: number, rx: number, y: number, w: number, h: number): string {
  const gaze: Gaze = e === 'think' || e === 'confused' ? 'up' : 'ahead';
  if (e === 'success') return eye(lx, y, w, h * 0.85, gaze, 'closed') + eye(rx, y, w, h * 0.85, gaze, 'closed');
  return eye(lx, y, w, h, gaze, e === 'wink' ? 'wink' : 'open') + eye(rx, y, w, h, gaze, 'open');
}

const body = (fur: string, belly: string) =>
  ellipse(128, 208, 54, 44, fur) + ellipse(128, 214, 32, 30, belly, 4)
  + ellipse(104, 248, 17, 8, belly, 4.5) + ellipse(152, 248, 17, 8, belly, 4.5);

const mirror = (svg: string) => `<g transform="translate(256 0) scale(-1 1)">${svg}</g>`;

function fox(e: Expression): string {
  const FUR = '#e8590c', DARK = '#3b1d0a';
  return `
    <g transform="rotate(-38 206 196)">${ellipse(206, 196, 24, 50, FUR)}${path('M190,160 q16,-26 32,0 q-16,10 -32,0 z', WHITE, 4)}</g>
    ${body(FUR, WHITE)}
    ${path('M62,100 L70,24 L116,66 z', FUR)}${mirror(path('M62,100 L70,24 L116,66 z', FUR))}
    ${path('M76,84 L79,46 L102,68 z', DARK, 0)}${mirror(path('M76,84 L79,46 L102,68 z', DARK, 0))}
    ${path('M50,112 q0,-60 78,-62 q78,2 78,62 q0,20 -16,32 l-62,34 l-62,-34 q-16,-12 -16,-32 z', FUR)}
    ${path('M80,132 q24,-12 48,-2 q24,-10 48,2 l-48,46 z', WHITE, 4)}
    ${eyes(e, 98, 158, 108, 13, 16)}
    ${ellipse(128, 150, 10, 7, INK, 0)}
    ${mouth(e, 160, 10)}
    ${arms(e, FUR, WHITE)}
    ${e === 'confused' ? QUESTION : ''}`;
}

function bear(e: Expression): string {
  const FUR = '#8d5524', LIGHT = '#e3bf8f';
  return `
    ${body(FUR, LIGHT)}
    <circle cx="66" cy="60" r="28" fill="${FUR}" stroke="${INK}" stroke-width="5"/><circle cx="190" cy="60" r="28" fill="${FUR}" stroke="${INK}" stroke-width="5"/>
    <circle cx="66" cy="60" r="15" fill="${LIGHT}"/><circle cx="190" cy="60" r="15" fill="${LIGHT}"/>
    ${ellipse(128, 112, 76, 64, FUR)}
    ${ellipse(128, 144, 36, 26, LIGHT, 4)}
    ${eyes(e, 98, 158, 102, 13, 16)}
    ${path('M116,130 q12,-6 24,0 q-2,10 -12,12 q-10,-2 -12,-12 z', INK, 2)}
    ${mouth(e, 150, 11)}
    ${arms(e, FUR, LIGHT)}
    ${e === 'confused' ? QUESTION : ''}`;
}

function moose(e: Expression): string {
  const FUR = '#6b4226', LIGHT = '#b07d56', ANTLER = '#e6c88f';
  const antler = path('M84,70 q-52,-4 -62,-48 q14,10 22,4 q-4,-16 2,-28 q10,14 18,14 q0,-14 10,-22 q6,16 14,22 q12,26 -4,58 z', ANTLER, 4.5);
  return `
    ${body(FUR, LIGHT)}
    ${antler}${mirror(antler)}
    ${path('M80,98 q-36,-2 -44,-22 q24,-8 46,8 z', FUR, 4.5)}${mirror(path('M80,98 q-36,-2 -44,-22 q24,-8 46,8 z', FUR, 4.5))}
    ${path('M80,82 q48,-30 96,0 q18,42 8,82 q-10,34 -56,38 q-46,-4 -56,-38 q-10,-40 8,-82 z', FUR)}
    ${path('M118,196 q10,22 20,0', FUR, 4)}
    ${ellipse(128, 168, 42, 28, LIGHT, 4)}
    ${ellipse(113, 162, 5, 7, INK, 0)}${ellipse(143, 162, 5, 7, INK, 0)}
    ${eyes(e, 102, 154, 112, 12, 15)}
    ${mouth(e, 178, 10)}
    ${arms(e, FUR, LIGHT)}
    ${e === 'confused' ? QUESTION : ''}`;
}

function owl(e: Expression): string {
  const FEATHER = '#a0703c', LIGHT = '#efdcb4', BEAK = '#f59f00';
  const chevrons = [190, 206, 222].map(y => stroke(`M114,${y} l6,6 l6,-6 M132,${y} l6,6 l6,-6`, FEATHER, 3)).join('');
  return `
    ${path('M66,108 l-8,-56 l44,34 z', FEATHER)}${mirror(path('M66,108 l-8,-56 l44,34 z', FEATHER))}
    ${ellipse(128, 160, 76, 86, FEATHER)}
    ${ellipse(128, 200, 44, 44, LIGHT, 4)}${chevrons}
    <circle cx="96" cy="118" r="34" fill="${LIGHT}" stroke="${INK}" stroke-width="4"/><circle cx="160" cy="118" r="34" fill="${LIGHT}" stroke="${INK}" stroke-width="4"/>
    ${eyes(e, 96, 160, 118, 19, 21)}
    ${path('M118,142 l10,24 l10,-24 q-10,-6 -20,0 z', BEAK, 3.5)}
    ${ellipse(108, 248, 14, 7, BEAK, 4)}${ellipse(148, 248, 14, 7, BEAK, 4)}
    ${arms(e, FEATHER, FEATHER)}
    ${e === 'confused' ? QUESTION : ''}`;
}

function squirrel(e: Expression): string {
  const FUR = '#c4602b', LIGHT = '#f6dcc2';
  return `
    ${path('M160,238 q76,-4 78,-84 q2,-74 -62,-78 q-40,2 -44,36 q30,-22 58,0 q24,26 6,74 q-12,34 -40,40 z', FUR)}
    ${stroke('M176,96 q34,4 40,48', '#8a3d12', 3)}
    ${body(FUR, LIGHT)}
    ${path('M70,88 l2,-50 l34,34 z', FUR)}${mirror(path('M70,88 l2,-50 l34,34 z', FUR))}
    ${stroke('M72,40 l-6,-10 M74,38 l2,-12 M186,38 l-2,-12 M188,40 l6,-10', INK, 3)}
    ${ellipse(128, 112, 66, 58, FUR)}
    ${ellipse(128, 140, 42, 26, LIGHT, 4)}
    ${eyes(e, 102, 154, 104, 13, 16)}
    ${ellipse(128, 128, 8, 6, INK, 0)}
    ${mouth(e, 142, 10)}
    <rect x="122" y="143" width="12" height="9" rx="2" fill="${WHITE}" stroke="${INK}" stroke-width="2.5"/>
    ${arms(e, FUR, LIGHT)}
    ${e === 'confused' ? QUESTION : ''}`;
}

function raccoon(e: Expression): string {
  const FUR = '#8e959c', DARK = '#343a40', LIGHT = '#f1f3f5';
  return `
    <g transform="rotate(-32 206 196)">${ellipse(206, 196, 22, 50, FUR)}
      ${ellipse(206, 170, 20, 6, DARK, 0)}${ellipse(206, 192, 22, 6, DARK, 0)}${ellipse(206, 214, 20, 6, DARK, 0)}${ellipse(206, 152, 12, 7, DARK, 0)}</g>
    ${body(FUR, LIGHT)}
    ${path('M64,92 l2,-46 l42,28 z', FUR)}${mirror(path('M64,92 l2,-46 l42,28 z', FUR))}
    ${path('M74,80 l2,-22 l18,14 z', DARK, 0)}${mirror(path('M74,80 l2,-22 l18,14 z', DARK, 0))}
    ${ellipse(128, 112, 78, 62, FUR)}
    ${ellipse(128, 128, 60, 40, LIGHT, 4)}
    ${path('M64,108 q32,-26 64,-6 q32,-20 64,6 q-6,24 -32,24 q-20,0 -32,-12 q-12,12 -32,12 q-26,0 -32,-24 z', DARK, 3)}
    ${eyes(e, 100, 156, 108, 12, 14)}
    ${ellipse(128, 138, 10, 7, INK, 0)}
    ${mouth(e, 150, 10)}
    ${arms(e, FUR, DARK)}
    ${e === 'confused' ? QUESTION : ''}`;
}

const DRAW: Record<Critter, (e: Expression) => string> = { fox, moose, bear, owl, squirrel, raccoon };

export function critterSvg(c: Critter, e: Expression = 'hello'): string {
  const pose = (EXPRESSIONS as readonly string[]).includes(e) ? e : 'hello';
  return stickerSvg(DRAW[c](pose));
}
