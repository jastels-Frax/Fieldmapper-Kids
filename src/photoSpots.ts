import type { PhotoSpot, SpotShot } from './types.ts';
import { compassWord, norm } from './heading.ts';
import { localDay } from './geo.ts';

/**
 * Photo spots, the pure half: Field Mapper's photo points (`PhotoPointData` + `buildPhotoFeature`, the view cone of
 * `MapManager.buildPhotoPointCone`) for a child. A spot is where the explorer stood, the picture, and which way the
 * camera looked; on the map it is a round photo badge with a beam pointing that way. Three departures, each for a child:
 * - the direction may be UNKNOWN (no compass, and "not sure" chosen): absent, never 0, which would draw a beam
 *   pointing north that nobody chose (Field Mapper's bearing is a required number);
 * - a library photo's own location (EXIF) is never read — Scout's rule — so a spot is placed by the GPS or a tap;
 * - a spot can be taken AGAIN on another day, keeping every picture: then and now, what changed with the seasons.
 */

/** The eight arrows a child picks the way from, clockwise from north; the map never turns, so up is north. */
export const ARROWS: { deg: number; word: string }[] = [0, 45, 90, 135, 180, 225, 270, 315].map(deg => ({ deg, word: compassWord(deg) }));

/** The way a spot looks on the map: its newest picture's that has one. Undefined = no beam. */
export function spotBearing(spot: Pick<PhotoSpot, 'shots'>): number | undefined {
  for (let i = spot.shots.length - 1; i >= 0; i--) {
    const b = spot.shots[i].bearing;
    if (typeof b === 'number' && Number.isFinite(b)) return b;
  }
  return undefined;
}

/** The newest picture taken at a spot. */
export function newestShot(spot: Pick<PhotoSpot, 'shots'>): SpotShot | undefined {
  return spot.shots[spot.shots.length - 1];
}

/**
 * A photo spot on the map is ONE icon — a round photo badge with a beam fanning out the way the camera looked — and it
 * scales as ONE piece. (It was a pin and a wedge, two markers scaled two different ways, and read as two unrelated
 * things.) Full size from `SPOT_FULL_ZOOM` in; easing down to 0.65 at zoom 14 and out, so a park full of spots is a
 * scatter of small badges rather than a heap. Never smaller: the badge has to stay a picture a child can tap.
 *
 * Field Mapper draws its cone in metres beside a fixed-size icon; that is exactly the two-ways scaling that looked
 * awkward here, so Scout keeps the beam in proportion to its badge instead.
 */
export const SPOT_FULL_ZOOM = 18;

export function spotScale(zoom: number): number {
  const t = Math.max(0, Math.min(1, (zoom - 14) / 4));
  return Math.round((0.65 + 0.35 * t) * 100) / 100;
}

/** The beam fades out between zoom 16 and 15: zoomed out to the whole park, a spot is its badge alone. */
export function beamOpacity(zoom: number): number {
  return Math.round(Math.max(0, Math.min(1, zoom - 15)) * 100) / 100;
}

/** A compass reading as stored: whole degrees, 0–359 (Field Mapper rounds the same way). */
export function storedBearing(deg: number): number {
  return Math.round(norm(deg)) % 360;
}

/** The arrow nearest a reading, so the picker lights the right one for a compass bearing. */
export function nearestArrow(deg: number): number {
  return (Math.round(norm(deg) / 45) % 8) * 45;
}

/** "Looking north-east", for the cards and reading aloud; null when the way is not known. */
export function lookingWords(bearing: number | undefined): string | null {
  return typeof bearing === 'number' ? `Looking ${compassWord(bearing)}` : null;
}

/** The spot with one more picture (taken again): at the end, so the shots stay oldest first. */
export function addShot(spot: PhotoSpot, shot: SpotShot): PhotoSpot {
  return { ...spot, shots: [...spot.shots, shot] };
}

/** The spot without one picture. A spot keeps at least one: removing the last is deleting the spot. */
export function removeShot(spot: PhotoSpot, shotId: string): PhotoSpot {
  if (spot.shots.length <= 1) return spot;
  return { ...spot, shots: spot.shots.filter(s => s.id !== shotId) };
}

/** On how many different days pictures were taken here (in `dayOf`'s time zone). */
export function shotDays(spot: Pick<PhotoSpot, 'shots'>, dayOf: (iso: string) => string = localDay): number {
  return new Set(spot.shots.map(s => dayOf(s.takenAt))).size;
}

/** Spots taken again on another day: what the "Then and Now" badge counts. */
export function repeatedSpots(spots: Pick<PhotoSpot, 'shots'>[], dayOf: (iso: string) => string = localDay): number {
  return spots.filter(s => shotDays(s, dayOf) >= 2).length;
}

/** A spot's title: its name, else "Photo spot". */
export function spotTitle(spot: Pick<PhotoSpot, 'name'>): string {
  return spot.name?.trim() || 'Photo spot';
}

/**
 * The view wedge as a polygon on the ground: apex at the spot, `angleDeg` wide, `lengthM` long — Field Mapper's
 * `buildPhotoPointCone` (two great-circle hops from the apex). Scout draws its beam in proportion to its badge instead
 * (`spotScale`), so this is what the
 * export writes, for a grown-up's GIS. [lon, lat] pairs, closed.
 */
export function viewWedge(lon: number, lat: number, bearing: number, angleDeg = 50, lengthM = 15): [number, number][] {
  const half = angleDeg / 2;
  const a = destination(lat, lon, bearing - half, lengthM);
  const b = destination(lat, lon, bearing + half, lengthM);
  return [[lon, lat], a, b, [lon, lat]];
}

/** The point `dist` metres from (lat, lon) along `bearing` on a sphere, as [lon, lat] (Field Mapper's geodesy.destination). */
function destination(lat: number, lon: number, bearing: number, dist: number): [number, number] {
  const R = 6371008.8;
  const rad = Math.PI / 180;
  const d = dist / R, th = bearing * rad, p1 = lat * rad, l1 = lon * rad;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(th));
  const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [((l2 / rad + 540) % 360) - 180, p2 / rad];
}

/**
 * How far the explorer is from a spot they are taking again, said to a child: close enough is within the GPS's
 * own wobble (never less than 8 m), because a phone cannot say "you are on the exact stone".
 */
export function backAtSpotWords(distanceM: number, accuracyM: number): { here: boolean; text: string } {
  if (distanceM <= Math.max(8, accuracyM)) return { here: true, text: 'You are at the spot!' };
  const m = distanceM < 100 ? Math.round(distanceM / 5) * 5 : Math.round(distanceM / 10) * 10;
  return { here: false, text: m < 1000 ? `The spot is ${m} metres away` : `The spot is ${(m / 1000).toFixed(1)} kilometres away` };
}
