import { headingFrom, type OrientationReading } from './heading.ts';

/**
 * The device compass, as Field Mapper's OrientationManager listens to it:
 * `deviceorientationabsolute` first, falling back to `deviceorientation` after a
 * second of silence (some devices only fire that one). `coords.heading` from the
 * GPS is no use here: it is the direction of TRAVEL and is null standing still,
 * which is exactly when a child looks around.
 */
export class Compass {
  private listener: ((e: Event) => void) | null = null;
  private live = false;
  onHeading: (deg: number) => void = () => {};

  get running(): boolean {
    return this.listener !== null;
  }

  /** Whether the browser will ask permission first (iOS 13+): then start() must come from a tap. */
  static needsPermission(): boolean {
    const DOE = (globalThis as { DeviceOrientationEvent?: { requestPermission?: unknown } }).DeviceOrientationEvent;
    return typeof DOE?.requestPermission === 'function';
  }

  static supported(): boolean {
    return 'DeviceOrientationEvent' in globalThis;
  }

  /** True when listening (permission granted or not needed), false if refused. */
  async start(): Promise<boolean> {
    if (this.listener) return true;
    if (!Compass.supported()) return false;
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DOE.requestPermission === 'function') {
      try {
        if ((await DOE.requestPermission()) !== 'granted') return false;
      } catch {
        return false;
      }
    }
    this.listener = (e: Event) => {
      const deg = headingFrom(e as unknown as OrientationReading);
      if (deg == null) return;
      this.live = true;
      this.onHeading(deg);
    };
    window.addEventListener('deviceorientationabsolute', this.listener, { passive: true });
    setTimeout(() => {
      if (!this.live && this.listener) window.addEventListener('deviceorientation', this.listener, { passive: true });
    }, 1000);
    return true;
  }

  /** Whether a reading has arrived since start(). */
  get hasReading(): boolean {
    return this.live;
  }

  stop(): void {
    if (this.listener) {
      window.removeEventListener('deviceorientationabsolute', this.listener);
      window.removeEventListener('deviceorientation', this.listener);
    }
    this.listener = null;
    this.live = false;
  }
}
