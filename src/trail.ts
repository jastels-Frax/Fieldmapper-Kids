import { getTrail, saveTrail, type TrailDay } from './storage.ts';
import { distanceM, localDay } from './geo.ts';
import type { Fix } from './gps.ts';
import { judgePoint } from './walk.ts';

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
  const t = await loadToday();
  // The same test a recorded path uses (walk.ts judgePoint): sharp enough, far enough, and no impossible leap.
  const prev = t.points[t.points.length - 1];
  const asWalk = prev ? [{ lon: prev[0], lat: prev[1], t: prev[2], acc: 0 }] : [];
  if (judgePoint(asWalk, { lon: fix.lon, lat: fix.lat, t: fix.time, acc: fix.accuracy }) !== 'kept') return false;
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
