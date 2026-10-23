/**
 * The explorer's buddy: Pip the rat or Hop the frog, the same characters (and
 * the same drawing) as Fraxinus Field Mapper's guided tour, copied from
 * GPS2026felt src/tour/avatars.ts so a child who meets them here meets them
 * there too. Green over white under a bold black line, with a white sticker
 * rim so they read on any background. Eight poses over one body, so every pose
 * is the same size. Pure strings (no DOM), so tests can import it.
 */
export type Buddy = 'rat' | 'frog';
export const BUDDY_NAMES: Record<Buddy, string> = { rat: 'Pip', frog: 'Hop' };

export const EXPRESSIONS = ['hello', 'think', 'excited', 'point', 'listen', 'confused', 'wink', 'success'] as const;
export type Expression = typeof EXPRESSIONS[number];

const INK = '#121512';
const GREEN = '#1e8a3e';
const DEEP = '#0f5a29';
const WHITE = '#fbfcf8';
const MOUTH = '#0b3319';
const TONGUE = '#3fae5c';
const LINE = `stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`;

const path = (d: string, fill: string, w = 5) => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const stroke = (d: string, color = INK, w = 3.5) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string, w = 5) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${w ? `stroke="${INK}" stroke-width="${w}"` : ''}/>`;

/** A limb: a black line under a narrower coloured one, so it reads as outlined. */
function limb(d: string, color = GREEN, w = 13): string {
  return `<path d="${d}" stroke="${INK}" stroke-width="${w + 9}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

type Gaze = 'ahead' | 'up' | 'side';

/** A glossy eye; `closed` draws the happy arc, `wink` the closed one. */
function eye(cx: number, cy: number, rx: number, ry: number, gaze: Gaze, state: 'open' | 'closed' | 'wink'): string {
  if (state !== 'open') {
    const d = state === 'closed' ? `M${cx - rx},${cy + 3} q${rx},-${ry * 1.1} ${rx * 2},0` : `M${cx - rx},${cy} q${rx},${ry * 0.7} ${rx * 2},0`;
    return stroke(d, INK, 5);
  }
  const dx = gaze === 'side' ? -rx * 0.25 : gaze === 'up' ? rx * 0.15 : 0;
  const dy = gaze === 'up' ? -ry * 0.3 : 0;
  const px = cx + dx, py = cy + dy;
  return ellipse(cx, cy, rx, ry, WHITE, 3.5)
    + ellipse(px, py, rx * 0.68, ry * 0.7, INK, 0)
    + `<circle cx="${(px + rx * 0.24).toFixed(1)}" cy="${(py - ry * 0.28).toFixed(1)}" r="${(rx * 0.26).toFixed(1)}" fill="${WHITE}"/>`
    + `<circle cx="${(px - rx * 0.2).toFixed(1)}" cy="${(py + ry * 0.26).toFixed(1)}" r="${(rx * 0.11).toFixed(1)}" fill="${WHITE}"/>`;
}

/** The question mark that floats beside a confused helper. */
const QUESTION = stroke('M214,30 q0,-14 14,-14 q14,0 14,13 q0,10 -12,15 v8', DEEP, 7) + `<circle cx="230" cy="66" r="4.5" fill="${DEEP}"/>`;

/** An open hand of four rounded fingers, centred at (x, y), fingers up. */
function openHand(x: number, y: number, tilt = 0): string {
  const fingers = [-11, -4, 4, 11].map((o, i) => `M${x + o * 0.9},${y} l${(o * 0.35).toFixed(1)},-${i === 0 || i === 3 ? 13 : 17}`).join(' ');
  return `<g transform="rotate(${tilt} ${x} ${y})">${limb(fingers, WHITE, 5)}${ellipse(x, y + 2, 12, 11, WHITE, 4.5)}</g>`;
}
const fist = (x: number, y: number) => ellipse(x, y, 11, 10, WHITE, 4.5) + stroke(`M${x - 4},${y + 9} v-5 M${x + 4},${y + 9} v-5`, INK, 2.5);
/** A pointing hand: a fist with the index finger out towards (x + dx). */
const pointing = (x: number, y: number) => limb(`M${x},${y - 3} h20`, WHITE, 6) + fist(x, y);

function ratArms(e: Expression): string {
  const downL = limb('M92,176 q-14,22 -2,40') + fist(92, 218);
  const downR = limb('M164,176 q14,22 2,40') + fist(164, 218);
  switch (e) {
    case 'hello': return downL + limb('M166,176 q24,-14 28,-48') + openHand(196, 124, 12);
    case 'point': return downL + limb('M166,180 q24,-4 42,-18') + pointing(210, 160);
    case 'think': case 'confused': return downL + limb('M166,182 q12,-24 -18,-34') + fist(146, 150);
    case 'excited': return limb('M90,176 q-22,-12 -26,-46') + limb('M166,176 q22,-12 26,-46') + openHand(62, 126, -14) + openHand(194, 126, 14);
    case 'success': return limb('M90,178 q-28,-2 -30,-38') + limb('M166,178 q28,-2 30,-38') + fist(60, 136) + fist(196, 136);
    default: return downL + downR;
  }
}

function ratMouth(e: Expression): string {
  const open = (w: number, h: number) => path(`M${128 - w},146 q${w},${h} ${w * 2},0 q-${w},${h * 0.35} -${w * 2},0 z`, MOUTH, 3.5)
    + `<ellipse cx="128" cy="${146 + h * 0.5}" rx="${w * 0.5}" ry="${h * 0.16}" fill="${TONGUE}"/>`;
  switch (e) {
    case 'hello': case 'point': case 'wink': return open(14, 26);
    case 'excited': case 'success': return open(18, 36);
    case 'think': return stroke('M120,152 q8,-3 16,0', INK, 3.5);
    case 'confused': return stroke('M118,153 q5,-5 10,0 q5,5 10,0', INK, 3.5);
    default: return stroke('M114,146 q14,14 28,0', INK, 4);
  }
}

function rat(e: Expression): string {
  const gaze: Gaze = e === 'think' || e === 'confused' ? 'up' : 'ahead';
  const eyes = e === 'success'
    ? eye(103, 106, 14, 15, gaze, 'closed') + eye(153, 106, 14, 15, gaze, 'closed')
    : eye(103, 106, 14, 18, gaze, e === 'wink' ? 'wink' : 'open') + eye(153, 106, 14, 18, gaze, 'open');
  const brows = e === 'confused' ? stroke('M90,80 q12,-8 26,-2 M140,76 q12,4 24,10', INK, 4)
    : e === 'think' ? stroke('M92,80 q11,-6 24,-2 M140,78 q11,-4 24,2', INK, 4) : '';
  return `
    ${limb('M174,232 q52,4 58,-34 q4,-26 -16,-30', WHITE, 6)}
    ${ellipse(128, 206, 56, 46, GREEN)}
    ${ellipse(128, 212, 34, 32, WHITE, 4)}
    ${stroke('M78,196 l8,4 l-6,6 M178,196 l-8,4 l6,6', DEEP, 3)}
    ${ellipse(104, 248, 17, 8, WHITE, 4.5)}${ellipse(152, 248, 17, 8, WHITE, 4.5)}
    <circle cx="62" cy="64" r="42" fill="${GREEN}" ${LINE}/><circle cx="194" cy="64" r="42" fill="${GREEN}" ${LINE}/>
    <circle cx="66" cy="68" r="30" fill="${WHITE}" stroke="${INK}" stroke-width="3"/><circle cx="190" cy="68" r="30" fill="${WHITE}" stroke="${INK}" stroke-width="3"/>
    ${path('M58,112 q0,-56 70,-58 q70,2 70,58 q0,30 -22,46 q-22,16 -48,16 q-26,0 -48,-16 q-22,-16 -22,-46 z', GREEN)}
    ${path('M112,58 l8,-14 l4,12 l8,-16 l4,16 l8,-10 l-2,14', GREEN, 4)}
    ${path('M90,126 q12,-8 26,-2 q12,6 24,0 q14,-6 26,2 q6,18 -8,32 q-18,16 -30,16 q-12,0 -30,-16 q-14,-14 -8,-32 z', WHITE, 4)}
    ${eyes}${brows}
    ${path('M119,128 q9,-5 18,0 q-2,9 -9,11 q-7,-2 -9,-11 z', INK, 2)}
    ${stroke('M128,139 v6', INK, 3)}
    ${stroke('M98,138 l-30,-7 M98,145 l-28,0 M100,151 l-20,6 M158,138 l30,-7 M158,145 l28,0 M156,151 l20,6', INK, 2.5)}
    ${ratMouth(e)}
    ${ratArms(e)}
    ${e === 'confused' ? QUESTION : ''}`;
}

/** A frog's hand: three fingers with round pads, splayed about `angle` degrees. */
function frogHand(x: number, y: number, angle: number): string {
  const tips = [-30, 0, 30].map((o) => {
    const a = ((angle + o) * Math.PI) / 180;
    return [x + Math.cos(a) * 16, y + Math.sin(a) * 16];
  });
  return limb(tips.map(([tx, ty]) => `M${x},${y} L${tx.toFixed(1)},${ty.toFixed(1)}`).join(' '), GREEN, 5)
    + tips.map(([tx, ty]) => `<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="5" fill="#cfe8c4" stroke="${INK}" stroke-width="3"/>`).join('');
}

/** The frog's arms: raised ones go BEHIND the head (they rise past it), the rest in front. */
function frogArms(e: Expression): { back: string; front: string } {
  const downL = limb('M90,186 q-6,26 6,44') + frogHand(98, 232, 100);
  const downR = limb('M166,186 q6,26 -6,44') + frogHand(158, 232, 80);
  const upL = limb('M86,186 q-50,-18 -52,-84') + frogHand(34, 98, -100);
  const upR = limb('M170,186 q50,-18 52,-84') + frogHand(222, 98, -80);
  switch (e) {
    case 'hello': return { back: upR, front: downL };
    case 'point': return { back: '', front: downL + limb('M168,188 q28,-2 46,-14') + frogHand(218, 172, -10) };
    case 'think': case 'confused': return { back: '', front: downL + limb('M168,190 q10,-26 -20,-34') + frogHand(146, 156, -110) };
    case 'excited': return { back: upL + upR, front: '' };
    case 'success': return { back: limb('M86,188 q-44,-6 -48,-60') + limb('M170,188 q44,-6 48,-60') + frogHand(38, 126, -120) + frogHand(218, 126, -60), front: '' };
    default: return { back: '', front: downL + downR };
  }
}

function frogMouth(e: Expression): string {
  const open = (drop: number) => path(`M66,130 q62,18 124,0 q-10,${drop} -62,${drop + 4} q-52,-4 -62,-${drop + 4} z`, MOUTH, 4.5)
    + `<path d="M98,${130 + drop * 0.78} q30,-${drop * 0.3} 60,0 q-30,${drop * 0.28} -60,0 z" fill="${TONGUE}"/>`;
  switch (e) {
    case 'hello': case 'point': case 'wink': return open(34);
    case 'excited': case 'success': return open(42);
    case 'think': return stroke('M88,142 q40,12 80,0', INK, 4.5);
    case 'confused': return stroke('M86,146 q21,-10 42,0 q21,10 42,0', INK, 4.5);
    default: return stroke('M70,132 q58,30 116,0', INK, 4.5);
  }
}

function frog(e: Expression): string {
  const gaze: Gaze = e === 'think' || e === 'confused' ? 'up' : 'ahead';
  const eyes = e === 'success'
    ? eye(82, 70, 17, 18, gaze, 'closed') + eye(174, 70, 17, 18, gaze, 'closed')
    : eye(82, 70, 17, 19, gaze, e === 'wink' ? 'wink' : 'open') + eye(174, 70, 17, 19, gaze, 'open');
  const arms = frogArms(e);
  const spot = (x: number, y: number, r: number) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.8}" fill="${DEEP}"/>`;
  return `
    ${ellipse(66, 214, 40, 30, GREEN)}${ellipse(190, 214, 40, 30, GREEN)}
    ${spot(54, 206, 6)}${spot(74, 222, 4.5)}${spot(202, 206, 6)}${spot(182, 222, 4.5)}
    ${frogHand(40, 240, 160)}${frogHand(216, 240, 20)}
    ${ellipse(128, 196, 56, 48, GREEN)}
    ${ellipse(128, 206, 38, 34, WHITE, 4)}
    ${arms.back}
    ${path('M38,118 q0,-50 90,-52 q90,2 90,52 q0,54 -90,60 q-90,-6 -90,-60 z', GREEN)}
    <circle cx="82" cy="72" r="32" fill="${GREEN}" ${LINE}/><circle cx="174" cy="72" r="32" fill="${GREEN}" ${LINE}/>
    ${spot(128, 92, 5)}${spot(110, 104, 3.5)}${spot(146, 104, 3.5)}${spot(56, 120, 4)}${spot(200, 120, 4)}
    ${eyes}
    <circle cx="118" cy="114" r="3" fill="${INK}"/><circle cx="138" cy="114" r="3" fill="${INK}"/>
    ${frogMouth(e)}
    ${arms.front}
    ${e === 'confused' ? QUESTION : ''}`;
}

/** The buddy as an SVG string, sized by the caller's CSS. */
let rimSeq = 0;

export function buddySvg(persona: Buddy, e: Expression = 'hello'): string {
  const rimId = `buddy-rim-${++rimSeq}`;
  const pose = (EXPRESSIONS as readonly string[]).includes(e) ? e : 'hello';
  // The sticker rim: the figure's own silhouette, dilated and filled white, under it.
  const filter = `<defs><filter id="${rimId}" x="-6%" y="-6%" width="112%" height="112%">`
    + `<feMorphology in="SourceAlpha" operator="dilate" radius="5" result="fat"/>`
    + `<feFlood flood-color="${WHITE}"/><feComposite operator="in" in2="fat" result="rim"/>`
    + `<feMerge><feMergeNode in="rim"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  return `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">`
    + `${filter}<g filter="url(#${rimId})"><g transform="translate(12 10) scale(0.9)">${persona === 'frog' ? frog(pose) : rat(pose)}</g></g></svg>`;
}
