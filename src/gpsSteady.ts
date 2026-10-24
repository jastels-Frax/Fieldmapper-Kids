/**
 * The STEADIED single fix — where a find is placed when it goes "where I was standing".
 *
 * COPIED from Field Mapper (`src/lib/gpsSteady.ts`, what its GPS ▸ Point saves); only the distance import and
 * this paragraph differ. Keep the two in step. Field Mapper's notes follow.
 *
 * A single tap used to record the newest fix and nothing else, so a tap landing on
 * one of the jumped fixes every receiver produces now and then (several metres off
 * for a second or two), or on the unsettled first fixes after stepping out from
 * under cover, recorded that fix. This takes the last few seconds of fixes instead,
 * finds their MEDIAN position, drops any fix far from the cluster, and takes the
 * median of what is left.
 *
 * What it does NOT do is make the position more accurate than the receiver is.
 * Fixes a few seconds apart share almost all of their error (satellite geometry,
 * the atmosphere, reflections off whatever is nearby change over tens of minutes,
 * not seconds), so this guards against a BAD fix; it does not average a good one
 * into a better one. That is why there is no separate averaging tool: a longer
 * occupation buys nothing a crew would notice.
 *
 * A median, not a mean: one jumped fix moves a mean by its share of the window and
 * moves a median not at all. The fix's reported accuracy is not used to weight or
 * reject anything — it is the platform's estimate, not the receiver's (see
 * Field Mapper's `gpsAveraging.ts`); only the coordinates decide.
 *
 * Pure and dependency-free apart from `geo.ts`. Unit-tested in `test/gpsSteady.test.ts`.
 */

import { distanceM as haversineDistance } from './geo.ts';

export interface SteadySample {
  lat: number;
  lon: number;
  elevation: number | null;
  accuracy: number | null;
  /** Epoch ms of the FIX. */
  timestamp: number;
}

/** How many seconds of fixes a tap looks back over. */
export const STEADY_WINDOW_MS = 8000;
/** Fewest fixes a steadied position is taken from before the tap waits for more. */
export const STEADY_MIN_FIXES = 3;
/**
 * A fix this far from the median, or this many times the typical distance from it
 * (whichever is larger), is a jump and is left out. The floor stops a tight
 * cluster from rejecting ordinary jitter.
 */
export const STEADY_REJECT_FLOOR_M = 3;
export const STEADY_REJECT_FACTOR = 3;
/**
 * Fixes a few seconds apart normally sit within a metre or two of each other; a
 * window whose TYPICAL fix is further than this from the median is not a steady
 * reading, whatever the rejection made of it.
 */
export const STEADY_UNSETTLED_M = 5;

export interface SteadyFix {
  lat: number;
  lon: number;
  elevation: number | null;
  /** Median of the KEPT fixes' reported accuracy — still the device's claim. */
  accuracy: number | null;
  /** Fixes the position was taken from (after rejection). */
  samples: number;
  /** Fixes left out as jumps. */
  rejected: number;
  /** Seconds between the first and last fix used. */
  windowS: number;
  /** Largest distance of a kept fix from the result, metres. */
  spreadM: number;
  firstTimestamp: number;
  lastTimestamp: number;
  /**
   * True when the window held too few fixes, more of them were jumps than not, or
   * the typical fix sat further than `STEADY_UNSETTLED_M` from the median.
   * The caller waits a few seconds for a better window and, failing one, saves
   * this anyway and says so.
   */
  unsettled: boolean;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function medianOf(fixes: SteadySample[]): { lat: number; lon: number } {
  return { lat: median(fixes.map(f => f.lat)), lon: median(fixes.map(f => f.lon)) };
}

export interface SteadyOptions {
  windowMs?: number;
  /**
   * A fix whose REPORTED accuracy is worse than this is not used at all (in Field
   * Mapper, `AppSettings.gps_min_accuracy`; Scout sets none). A fix that reports
   * no accuracy is kept (nothing says it is coarse).
   */
  maxAccuracyM?: number;
}

/**
 * The steadied position from the recent fixes, or null when there are none —
 * or none within the accuracy limit. The window is measured back from the NEWEST
 * fix, not from the clock: a stationary device can go seconds between
 * deliveries, and the fixes it has are still the right ones to use. It is
 * measured BEFORE the accuracy limit is applied, so a coarse run of fixes now
 * never falls back on good fixes from a minute ago.
 */
export function steadyFix(recent: readonly SteadySample[], opts: SteadyOptions = {}): SteadyFix | null {
  const windowMs = opts.windowMs ?? STEADY_WINDOW_MS;
  const limit = opts.maxAccuracyM;
  const usable = recent.filter(f => Number.isFinite(f.lat) && Number.isFinite(f.lon) && Number.isFinite(f.timestamp));
  if (!usable.length) return null;
  const newest = Math.max(...usable.map(f => f.timestamp));
  // One sample per fix time: a platform re-delivering a cached position must not
  // count twice.
  const byTime = new Map<number, SteadySample>();
  for (const f of usable) {
    if (f.timestamp < newest - windowMs) continue;
    if (limit !== undefined && Number.isFinite(limit) && f.accuracy !== null && f.accuracy > limit) continue;
    byTime.set(f.timestamp, f);
  }
  if (!byTime.size) return null;
  const window = [...byTime.values()].sort((a, b) => a.timestamp - b.timestamp);

  const centre = medianOf(window);
  const dist = window.map(f => haversineDistance(centre.lat, centre.lon, f.lat, f.lon));
  const reject = Math.max(STEADY_REJECT_FLOOR_M, STEADY_REJECT_FACTOR * median(dist));
  const kept = window.filter((_, i) => dist[i] <= reject);
  const use = kept.length ? kept : window;

  const pos = medianOf(use);
  const elevs = use.map(f => f.elevation).filter((e): e is number => e !== null && Number.isFinite(e));
  const accs = use.map(f => f.accuracy).filter((a): a is number => a !== null && Number.isFinite(a));
  const typicalM = median(use.map(f => haversineDistance(pos.lat, pos.lon, f.lat, f.lon)));
  const spreadM = Math.max(0, ...use.map(f => haversineDistance(pos.lat, pos.lon, f.lat, f.lon)));
  const first = use[0].timestamp;
  const last = use[use.length - 1].timestamp;
  const rejected = window.length - use.length;
  return {
    lat: pos.lat,
    lon: pos.lon,
    elevation: elevs.length ? median(elevs) : null,
    accuracy: accs.length ? median(accs) : null,
    samples: use.length,
    rejected,
    windowS: (last - first) / 1000,
    spreadM,
    firstTimestamp: first,
    lastTimestamp: last,
    unsettled: window.length < STEADY_MIN_FIXES || rejected > use.length || typicalM > STEADY_UNSETTLED_M,
  };
}
