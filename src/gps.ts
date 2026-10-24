/** The one location watcher. Everything that needs "where am I" reads it here. */
export interface Fix {
  lat: number;
  lon: number;
  accuracy: number;
  time: number;
}

type Listener = (fix: Fix | null, error?: string) => void;

let last: Fix | null = null;
/** Field Mapper's watch options (CaptureManager.startGPSWatch), so the two apps track position alike. */
const WATCH_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 };
let watchId: number | null = null;
const listeners = new Set<Listener>();

export function lastFix(): Fix | null {
  // A fix older than two minutes no longer says where the explorer is.
  return last && Date.now() - last.time < 120_000 ? last : null;
}

/**
 * The last position whatever its age: where the explorer's avatar is drawn. Standing still, a phone often
 * sends no new position for minutes (and none at all while the app is in the background), so a "fresh
 * only" answer left the 📍 button saying it was still looking while the avatar sat on the map.
 */
export function knownFix(): Fix | null {
  return last;
}

let lastError: string | undefined;

/** Why there is no position, if the phone said (e.g. location not allowed). */
export function fixProblem(): string | undefined {
  return lastError;
}

const accept = (p: GeolocationPosition) => {
  last = { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy, time: Date.now() };
  lastError = undefined;
  listeners.forEach(l => l(last));
};

const problem = (err: GeolocationPositionError) => {
  const msg = err.code === err.PERMISSION_DENIED
    ? 'Ask a grown-up to let this app use your location.'
    : 'Looking for where you are…';
  lastError = msg;
  listeners.forEach(l => l(null, msg));
};

/** Asks the phone for a position right now, not one it remembers. Resolves null if none comes in time. */
export function refreshFix(timeoutMs = 10000): Promise<Fix | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      p => { accept(p); resolve(last); },
      err => { problem(err); resolve(null); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    );
  });
}

export function onFix(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function startGps(): void {
  if (watchId !== null || !('geolocation' in navigator)) {
    if (!('geolocation' in navigator)) listeners.forEach(l => l(null, 'This device cannot tell where it is.'));
    return;
  }
  watchId = navigator.geolocation.watchPosition(accept, problem, WATCH_OPTIONS);
  // A home-screen app on iOS can come back from the background with its watch quietly stopped: restart it.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || watchId === null) return;
    navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(accept, problem, WATCH_OPTIONS);
  });
}

/**
 * Waits up to `ms` for a fix at least as good as `goodM`, keeping the best one
 * seen. Resolves with the best fix (or the last known one, or null).
 */
export function bestFix(ms: number, goodM: number): Promise<Fix | null> {
  return new Promise(resolve => {
    let best = lastFix();
    if (best && best.accuracy <= goodM) return resolve(best);
    const off = onFix(f => {
      if (f && (!best || f.accuracy < best.accuracy)) best = f;
      if (best && best.accuracy <= goodM) done();
    });
    const timer = setTimeout(() => done(), ms);
    function done() {
      clearTimeout(timer);
      off();
      resolve(best);
    }
  });
}

/** Accuracy in words a child understands, with a colour class. */
export function accuracyWords(m: number): { text: string; level: 'great' | 'ok' | 'fuzzy' } {
  if (m <= 10) return { text: `Super close (about ${Math.round(m)} m)`, level: 'great' };
  if (m <= 30) return { text: `Pretty close (about ${Math.round(m)} m)`, level: 'ok' };
  return { text: `A bit fuzzy (about ${Math.round(m)} m)`, level: 'fuzzy' };
}
