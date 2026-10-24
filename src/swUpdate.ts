/**
 * Service-worker update policy, PORTED from Field Mapper (`src/utils/SwUpdate.ts`) — keep the two in step.
 *
 * The build is `registerType: 'prompt'` (vite.config.ts): a new deploy installs and precaches in the background
 * and then WAITS, so nothing changes under a running page. This decides the rest:
 *
 *  1. HOW OFTEN to look for a new sw.js — at most once every 6 hours (tried at launch, on coming back to the
 *     foreground and hourly), never offline, on Data Saver or on a 2G-class link.
 *  2. WHEN a waiting worker may take over — only in the first few seconds after launch, before a find is under
 *     way. Field Mapper also offers a "tap to update" prompt; Scout has none for children to meet, so an update
 *     found later simply waits for the next launch.
 *
 * A cooldown stops a CDN that serves two builds mid-rollout from turning launches into a reload loop.
 */
const GRACE_MS = 8_000;
const MIN_CHECK_INTERVAL_MS = 6 * 60 * 60_000;
const POLL_INTERVAL_MS = 60 * 60_000;
const AUTO_APPLY_COOLDOWN_MS = 15 * 60_000;

const LS_LAST_CHECK = 'scout.sw.lastUpdateCheck';
const LS_LAST_AUTO_APPLY = 'scout.sw.lastAutoApply';

function readTs(key: string): number {
  try {
    const n = parseInt(localStorage.getItem(key) ?? '', 10);
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

function writeTs(key: string, value: number): void {
  try { localStorage.setItem(key, String(value)); } catch { /* private mode */ }
}

/** Slow / metered / offline links: never spend them on an update check. */
function linkIsTooPoorToUpdate(): boolean {
  if (navigator.onLine === false) return true;
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
}

export const SwUpdate = {
  startedAt: 0,
  hasUpdate: false,
  applying: false,
  refreshing: false,
  registration: null as ServiceWorkerRegistration | null,

  init(): void {
    if (!('serviceWorker' in navigator)) return;
    this.startedAt = Date.now();
    // The only controller change expected is the one our own applyUpdate() causes: reload for that, and leave
    // any other alone rather than pull the page out from under a child.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!navigator.serviceWorker.controller) return;
      if (this.applying && !this.refreshing) {
        this.refreshing = true;
        location.reload();
      }
    });
  },

  watch(reg: ServiceWorkerRegistration): void {
    this.registration = reg;
    // A worker may already be waiting from an earlier session.
    if (reg.waiting && navigator.serviceWorker.controller) this.onUpdateReady();
    reg.addEventListener('updatefound', () => {
      const incoming = reg.installing;
      incoming?.addEventListener('statechange', () => {
        if (incoming.state === 'installed' && navigator.serviceWorker.controller) this.onUpdateReady();
      });
    });
    this.maybeCheck();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.maybeCheck(); });
    setInterval(() => this.maybeCheck(), POLL_INTERVAL_MS);
  },

  maybeCheck(): void {
    const reg = this.registration;
    if (!reg || this.hasUpdate || this.applying) return;
    if (linkIsTooPoorToUpdate()) return;
    if (Date.now() - readTs(LS_LAST_CHECK) < MIN_CHECK_INTERVAL_MS) return;
    writeTs(LS_LAST_CHECK, Date.now());
    reg.update().catch(() => { /* offline or blocked: next window */ });
  },

  onUpdateReady(): void {
    if (this.hasUpdate || this.applying) return;
    const withinGrace = Date.now() - this.startedAt < GRACE_MS;
    const cooledDown = Date.now() - readTs(LS_LAST_AUTO_APPLY) > AUTO_APPLY_COOLDOWN_MS;
    if (withinGrace && cooledDown && !linkIsTooPoorToUpdate()) {
      writeTs(LS_LAST_AUTO_APPLY, Date.now());
      this.applyUpdate();
      return;
    }
    // Waits for the next launch.
    this.hasUpdate = true;
  },

  applyUpdate(): void {
    const waiting = this.registration?.waiting;
    if (this.applying || !waiting) return;
    this.applying = true;
    waiting.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(() => { if (!this.refreshing) { this.refreshing = true; location.reload(); } }, 3000);
  },
};
