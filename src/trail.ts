import { getTrail, saveTrail, type TrailDay } from './storage.ts';
import { distanceM, localDay } from './geo.ts';
import type { Fix } from './gps.ts';

/** Today's walk, as points far enough apart to be movement rather than GPS wobble. */
let today: TrailDay | null = null;
let saveTimer: number | undefined;

export async function loadToday(): Promise<TrailDay> {
  const day = localDay(new Date().toISOString());
  if (today?.day !== day) today = (await getTrail(day)) ?? { day, points: [] };
  return today;
}

/** Adds a fix to today's trail. Returns true when the trail grew. */
export async function addToTrail(fix: Fix): Promise<boolean> {
  if (fix.accuracy > 40) return false;
  const t = await loadToday();
  const prev = t.points[t.points.length - 1];
  const minStep = Math.max(8, fix.accuracy);
  if (prev && distanceM(prev[1], prev[0], fix.lat, fix.lon) < minStep) return false;
  t.points.push([fix.lon, fix.lat, fix.time]);
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void saveTrail(t), 3000);
  return true;
}

export function trailLengthM(t: TrailDay): number {
  let m = 0;
  for (let i = 1; i < t.points.length; i++) {
    m += distanceM(t.points[i - 1][1], t.points[i - 1][0], t.points[i][1], t.points[i][0]);
  }
  return m;
}
