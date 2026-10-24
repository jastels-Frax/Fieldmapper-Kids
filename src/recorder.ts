import { onFix } from './gps.ts';
import { addPoint, type Walk } from './walk.ts';
import { saveWalk } from './storage.ts';
import { uid } from './ids.ts';

/**
 * Streams GPS fixes into a path while "Record my path" is on. The path is saved
 * every few seconds as it grows, so a closed tab loses at most the last steps.
 * Keeping the screen awake meanwhile is App's (wakeLock.ts, the app's one holder).
 */
export class PathRecorder {
  walk: Walk | null = null;
  private off: (() => void) | null = null;
  private saveTimer: number | undefined;
  onChange: (w: Walk | null) => void = () => {};

  get recording(): boolean {
    return !!this.walk && !this.walk.endedAt;
  }

  async start(profileId: string): Promise<void> {
    if (this.recording) return;
    this.walk = { id: uid(), profileId, startedAt: new Date().toISOString(), points: [] };
    this.off = onFix(fix => {
      if (!fix || !this.walk) return;
      const r = addPoint(this.walk.points, { lon: fix.lon, lat: fix.lat, t: fix.time, acc: fix.accuracy });
      if (r.verdict !== 'kept') return;
      this.walk = { ...this.walk, points: r.points };
      this.onChange(this.walk);
      this.scheduleSave();
    });
    await saveWalk(this.walk);
    this.onChange(this.walk);
  }

  /** Ends the recording and returns it (saved), or null if nothing was recording. */
  async stop(): Promise<Walk | null> {
    if (!this.walk) return null;
    this.off?.();
    this.off = null;
    clearTimeout(this.saveTimer);
    const done: Walk = { ...this.walk, endedAt: new Date().toISOString() };
    this.walk = null;
    await saveWalk(done);
    this.onChange(null);
    return done;
  }

  private scheduleSave(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => { if (this.walk) void saveWalk(this.walk); }, 4000);
  }
}
