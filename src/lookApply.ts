import { lookAttributes, normalizeLook, themeBar, type Look } from './look.ts';

/** Paints a look onto the page: one data- attribute per choice, plus the browser bar colour. */
export function applyLook(raw: Partial<Look> | undefined): Look {
  const look = normalizeLook(raw);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(lookAttributes(look))) root.dataset[k] = v;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeBar(look.theme));
  return look;
}

/** Whether confetti and bounces should run: the explorer's choice and the device's. */
export function motionAllowed(): boolean {
  return document.documentElement.dataset.motion !== 'calm' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
}
