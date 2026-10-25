// Keep the screen awake — COPIED from Field Mapper (`src/utils/wakeLock.ts`); keep the two in step.
//
// A phone that dims and locks stops giving the browser GPS fixes, so a recorded path gets a straight gap and the
// map stops following. The Screen Wake Lock API releases the lock whenever the page is hidden, so it is taken
// again every time the app comes back to the foreground, for as long as it is wanted. Where the API is missing
// (older iOS) this does nothing, and the Map card says so.
//
// One holder for the whole app, as in Field Mapper, where the rail button and the setting used to hold two
// locks that could not see each other: App decides whether it is wanted (`Settings.wakeLock`, or a path
// recording with `Settings.keepAwake`).

interface WakeLockSentinelLike {
  release(): Promise<void>;
  addEventListener(type: 'release', fn: () => void): void;
}

let wanted = false;
let sentinel: WakeLockSentinelLike | null = null;
let listening = false;

export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

async function acquire(): Promise<void> {
  if (!wanted || sentinel || document.visibilityState !== 'visible') return;
  const api = (navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<WakeLockSentinelLike> } }).wakeLock;
  if (!api) return;
  try {
    const s = await api.request('screen');
    // The setting may have been switched off while the request was in flight.
    if (!wanted) { void s.release(); return; }
    sentinel = s;
    s.addEventListener('release', () => { if (sentinel === s) sentinel = null; });
  } catch {
    // Refused (battery saver, a page not yet interacted with): try again on the
    // next return to the foreground rather than reporting it.
  }
}

/** Hold or drop the screen wake lock. Idempotent; called from `App.applyWakeLock`. */
export function setKeepAwake(on: boolean): void {
  wanted = on;
  if (!listening && typeof document !== 'undefined') {
    listening = true;
    document.addEventListener('visibilitychange', () => { void acquire(); });
  }
  if (on) void acquire();
  else if (sentinel) {
    const s = sentinel;
    sentinel = null;
    void s.release().catch(() => { /* already released */ });
  }
}
