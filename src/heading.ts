/**
 * Which way the explorer is facing, from the device compass. Pure: the event
 * listening is in compass.ts. The reading rules are Field Mapper's
 * (GPS2026felt src/capture/OrientationManager.ts), copied, so the two apps
 * agree about which way is which.
 */
export interface OrientationReading {
  /** iOS only: degrees clockwise from north, with declination already applied by the platform. */
  webkitCompassHeading?: number | null;
  absolute?: boolean | null;
  alpha?: number | null;
}

/** Degrees clockwise from north (0–360), or null when this event cannot say. */
export function headingFrom(e: OrientationReading): number | null {
  if (typeof e.webkitCompassHeading === 'number' && Number.isFinite(e.webkitCompassHeading)) return norm(e.webkitCompassHeading);
  // Android: an absolute event's alpha runs anticlockwise.
  if (e.absolute && typeof e.alpha === 'number' && Number.isFinite(e.alpha)) return norm(360 - e.alpha);
  return null;
}

export function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Eases the arrow towards a new reading the short way round, so it neither
 * shivers with the compass's noise nor spins all the way round when it crosses
 * north (350° → 10° is a 20° turn, not 340°). `k` is how far it moves per reading.
 * Returns an UNWRAPPED angle: the marker rotates continuously, never jumping by 360.
 */
export function smoothHeading(prev: number | null, next: number, k = 0.3): number {
  if (prev == null) return next;
  const diff = ((next - prev + 540) % 360) - 180;
  return prev + diff * k;
}

/** The eight compass words, for reading aloud. */
export function compassWord(deg: number): string {
  const words = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  return words[Math.round(norm(deg) / 45) % 8];
}
