/** The one location watcher. Everything that needs "where am I" reads it here. */
export interface Fix {
  lat: number;
  lon: number;
  accuracy: number;
  time: number;
}

type Listener = (fix: Fix | null, error?: string) => void;

let last: Fix | null = null;
let watchId: number | null = null;
const listeners = new Set<Listener>();

export function lastFix(): Fix | null {
  // A fix older than two minutes no longer says where the explorer is.
  return last && Date.now() - last.time < 120_000 ? last : null;
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
  watchId = navigator.geolocation.watchPosition(
    p => {
      last = { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy, time: Date.now() };
      listeners.forEach(l => l(last));
    },
    err => {
      const msg = err.code === err.PERMISSION_DENIED
        ? 'Ask a grown-up to let this app use your location.'
        : 'Looking for where you are…';
      listeners.forEach(l => l(null, msg));
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
  );
}
