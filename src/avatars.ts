import scout from './assets/avatars/scout.webp';
import scoutHat from './assets/avatars/scout-hat.webp';
import owl from './assets/avatars/owl.webp';
import robin from './assets/avatars/robin.webp';
import bluejay from './assets/avatars/bluejay.webp';
import beaver from './assets/avatars/beaver.webp';
import moose from './assets/avatars/moose.webp';
import bear from './assets/avatars/bear.webp';
import frog from './assets/avatars/frog.webp';
import turtle from './assets/avatars/turtle.webp';
import bat from './assets/avatars/bat.webp';

/** The image of each storybook portrait (avatarArt.ts holds the ids and names). */
const URLS: Record<string, string> = { scout, 'scout-hat': scoutHat, owl, robin, bluejay, beaver, moose, bear, frog, turtle, bat };

export function artUrl(id: string): string | undefined {
  return URLS[id];
}
