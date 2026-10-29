import { activeGuide } from './guides.ts';
import type { Find, FindMedia, GroupId, Profile, Settings } from './types.ts';
import { COLOURS, COUNTS, GROUPS, SIGNS, SIZES, categoryOf, fullName, groupOf, oneOf } from './categories.ts';
import { kindIcon } from './kindIcon.ts';
import { askYesNo, blobUrl, h, openSheet, whenWords } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { confetti } from './confetti.ts';
import { badgeProgress, toBadgeFind, type BadgeProgress } from './badges.ts';
import { challengesFor, completedChallenges, type Challenge } from './challenges.ts';
import { localDay } from './geo.ts';
import { askGrownUp } from './gateView.ts';
import { buddySays, crewSays, critterFigure, nameOf } from './buddyView.ts';
import { CRITTERS, critterSvg } from './critters.ts';
import { CAST } from './cast.ts';
import { artFor } from './sproutArt.ts';
import { cheer } from './buddyLines.ts';
import type { HuntItem, HuntRun } from './hunts.ts';

export interface ScreenHost {
  settings: Settings;
  profile: Profile;
  /** Opens the capture flow on a saved find to change it. */
  editFind: (f: Find) => void;
  finds: () => Find[];
  showOnMap: (f: Find) => void;
  remove: (f: Find) => Promise<void>;
  update: (f: Find) => Promise<void>;
  /** A find's pictures and voice, read on demand (finds in memory carry picture info only). */
  media: (id: string) => Promise<FindMedia>;
  startCapture: () => void;
  openHunts: () => void;
  huntsCompleted: () => number;
  tickChecks: () => number;
  badgeExtras: () => import('./badges.ts').BadgeExtras;
  openWalks: () => void;
  /** "My photo spots" (spotScreens.ts). */
  openSpots: () => void;
  /** Opens the end-of-adventure tick check. */
  tickCheck: () => void;
}

export interface HuntNews {
  run: HuntRun;
  ticked: HuntItem[];
  completed: boolean;
}

function pictureOf(f: Find, owner: Element, cls: string): HTMLElement {
  const blob = f.thumb;
  const cat = categoryOf(f.category);
  if (blob) {
    const img = h('img', { class: cls, alt: f.nickname || fullName(cat) });
    img.src = blobUrl(blob, owner);
    return img;
  }
  const art = f.species ? artFor(f.species.name) : undefined;
  if (art) {
    const el = h('span', { class: `${cls} emoji-pic art-pic`, style: `--cat:${cat.colour}`, 'aria-label': art.label });
    el.innerHTML = art.svg();
    return el;
  }
  const el = kindIcon(cat, `${cls} emoji-pic`);
  el.style.setProperty('--cat', cat.colour);
  return el;
}

/** After a save: a sticker, a cheer, a fact, and anything newly earned. */
export function celebrate(host: ScreenHost, f: Find, newBadges: BadgeProgress[], newChallenges: Challenge[], locatedOk: boolean, hunt: HuntNews | null): void {
  const cat = categoryOf(f.category);
  const fact = cat.facts[Math.floor(Math.random() * cat.facts.length)];
  const { body, close } = openSheet({ title: 'Hooray!', emoji: '🎉', className: 'celebrate' });
  const sticker = h('div', { class: 'big-sticker', style: `--cat:${cat.colour}` });
  body.append(sticker);
  sticker.append(pictureOf(f, sticker, 'big-sticker-pic'), kindIcon(cat, 'big-sticker-emoji'));
  const an = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
  const what = f.nickname ? `You found ${f.nickname}!`
    : f.category === 'sign' ? (f.species ? `You found ${f.species.name} clues!` : 'You found animal clues!')
    : f.species ? `You found ${an(f.species.name)} ${f.species.name}!`
    : `You found ${oneOf(cat)}!`;
  const buddy = host.profile.guide;
  const hooray = cheer(buddy);
  body.append(
    buddySays(buddy, { text: `${hooray.text} ${what}`, pose: hooray.pose }, { quiet: true, big: true }),
    crewSays('owl', { text: `Hoo! Did you know? ${fact}`, pose: 'point' }, { quiet: true }),
  );
  if (!locatedOk) body.append(h('p', { class: 'hint' }, '📖 This one is in your sticker book, but not on the map.'));
  if (hunt) {
    for (const i of hunt.ticked) {
      body.append(h('div', { class: 'win-card hunt' }, h('span', { class: 'win-emoji' }, i.emoji), h('p', {}, `Hunt: ${i.text}. Found it!`)));
    }
    if (hunt.completed) {
      body.append(h('div', { class: 'win-card trophy' }, h('span', { class: 'win-emoji' }, '🏆'),
        h('div', {}, h('strong', {}, `You finished the ${hunt.run.hunt.title}!`), h('p', {}, 'A trophy for your shelf!'))));
      if (host.settings.tickReminder) {
        body.append(h('button', { class: 'big-btn tick-btn', onclick: () => { back(); host.tickCheck(); } }, '🕷️ Heading home? Do a tick check'));
      }
    }
  }
  for (const c of newChallenges) {
    body.append(h('div', { class: 'win-card challenge' }, h('span', { class: 'win-emoji' }, '✅'), h('p', {}, `Challenge done: ${c.text}!`)));
  }
  for (const b of newBadges) {
    body.append(h('div', { class: 'win-card' }, h('span', { class: 'win-emoji' }, b.emoji), h('div', {}, h('strong', {}, `New badge: ${b.title}!`), h('p', {}, b.how))));
  }
  // Back to the map by itself, where "I found something!" is one tap away: a few seconds to enjoy it, longer for
  // each win to read, and a tap anywhere but a button goes back at once.
  const wins = newBadges.length + newChallenges.length + (hunt ? hunt.ticked.length + (hunt.completed ? 2 : 0) : 0);
  const ms = Math.min(10000, 4000 + wins * 1500);
  const bar = h('div', { class: 'auto-back', 'aria-hidden': 'true' }, h('span', { style: `animation-duration:${ms}ms` }));
  body.append(bar, h('p', { class: 'hint center' }, '🗺️ Back to the map in a moment. Tap to go now.'));
  let done = false;
  const back = () => { if (done) return; done = true; clearTimeout(timer); close(); };
  const timer = window.setTimeout(back, ms);
  body.addEventListener('click', e => { if (!(e.target as HTMLElement).closest('button')) back(); });
  body.closest('.sheet')?.querySelector('.close-btn')?.addEventListener('click', () => { done = true; clearTimeout(timer); });
  sounds.save();
  confetti([cat.emoji, ...newBadges.map(b => b.emoji), ...(hunt?.completed ? ['🏆'] : [])]);
  const huntWords = hunt ? [...hunt.ticked.map(i => `${i.text}, found it!`), hunt.completed ? `You finished the ${hunt.run.hunt.title}! A trophy for you!` : ''] : [];
  const words = [hooray.text, what, ...huntWords, ...newChallenges.map(c => `Challenge done! ${c.text}.`), ...newBadges.map(b => `You earned the ${b.title} badge!`), `Hoot says: did you know? ${fact}`];
  say(words.join(' '));
  if (newBadges.length || hunt?.completed) setTimeout(() => sounds.badge(), 700);
}

/** The sticker book: every find as a sticker, filtered by group (Plant, Animal…) or "not sure". */
export function openBook(host: ScreenHost): void {
  const { body, close } = openSheet({ title: 'My Finds', emoji: '📖', className: 'book' });
  void close;
  type Filter = GroupId | 'mystery' | 'all' | 'fav';
  let filter: Filter = 'all';
  const chips = h('div', { class: 'chips' });
  const grid = h('div', { class: 'sticker-grid' });
  /** A find's shelf in the book: its group, or "not sure" for a mystery. */
  const shelfOf = (f: Find): Filter => groupOf(f.category)?.id ?? 'mystery';

  const paint = () => {
    const counts = new Map<Filter, number>();
    for (const f of host.finds()) counts.set(shelfOf(f), (counts.get(shelfOf(f)) ?? 0) + 1);
    const mystery = categoryOf('mystery');
    const shelves = [...GROUPS.map(g => ({ id: g.id as Filter, emoji: g.emoji, art: g.art, label: g.label, colour: g.colour })),
      { id: 'mystery' as Filter, emoji: mystery.emoji, label: 'Not sure', colour: mystery.colour }];
    chips.replaceChildren(
      h('button', { class: `chip ${filter === 'all' ? 'on' : ''}`, onclick: () => { filter = 'all'; paint(); } }, `🌍 All ${host.finds().length}`),
      h('button', { class: `chip ${filter === 'fav' ? 'on' : ''}`, 'aria-label': 'Favourites', onclick: () => { filter = 'fav'; paint(); } }, '❤️'),
      ...shelves.filter(g => counts.has(g.id)).map(g =>
        h('button', { class: `chip ${filter === g.id ? 'on' : ''}`, style: `--cat:${g.colour}`, 'aria-label': `${g.label}: ${counts.get(g.id)}`, onclick: () => { filter = g.id; say(g.label); paint(); } },
          kindIcon(g, 'chip-ic'), ` ${counts.get(g.id)}`)),
    );
    const list = host.finds().filter(f => filter === 'all' || (filter === 'fav' ? f.favourite : shelfOf(f) === filter));
    grid.replaceChildren();
    if (!list.length) {
      grid.append(h('div', { class: 'empty' },
        host.finds().length
          ? h('p', {}, 'Nothing here yet.')
          : crewSays('squirrel', { text: 'I am Acorn! Your sticker book is empty. Go find something and I will keep it safe!', pose: 'confused' }),
        !host.finds().length && h('button', { class: 'big-btn', onclick: () => { close(); host.startCapture(); } }, '✨ I found something!'),
      ));
      return;
    }
    for (const f of list) {
      const cat = categoryOf(f.category);
      const card = h('button', { class: 'sticker', style: `--cat:${cat.colour}`, onclick: () => openFind(host, f.id, paint) });
      grid.append(card);
      card.append(pictureOf(f, card, 'sticker-pic'), kindIcon(cat, 'sticker-emoji'),
        h('span', { class: 'sticker-name' }, f.nickname || fullName(cat)));
      if (f.favourite) card.append(h('span', { class: 'sticker-fav' }, '❤️'));
    }
  };
  if (host.finds().length) {
    const n = host.finds().length;
    body.append(crewSays('squirrel', { text: `Acorn here! You have ${n} ${n === 1 ? 'sticker' : 'stickers'}. Tap one to look closer.`, pose: 'excited' }));
  }
  body.append(chips, grid, h('div', { class: 'ask-row book-more' },
    h('button', { class: 'big-btn soft', onclick: () => host.openWalks() }, '👣 My paths'),
    h('button', { class: 'big-btn soft', onclick: () => host.openSpots() }, '📷 Photo spots')));
  paint();
  // An edit or a delete made from a find opened here redraws the book behind it.
  const onChanged = () => (grid.isConnected ? paint() : window.removeEventListener(FINDS_CHANGED, onChanged));
  window.addEventListener(FINDS_CHANGED, onChanged);
}

/** Fired on window whenever the finds on screen change. */
export const FINDS_CHANGED = 'scout-finds-changed';

/** One find, large: its picture, its sound, and what was noticed. */
export function openFind(host: ScreenHost, id: string, onChange?: () => void): void {
  const f = host.finds().find(x => x.id === id);
  if (!f) return;
  const together = host.profile.mode === 'together';
  const cat = categoryOf(f.category);
  const { body, close } = openSheet({ title: f.nickname || fullName(cat), emoji: cat.emoji, className: 'detail' });
  if (f.pictures.length) {
    const strip = h('div', { class: `detail-pics ${f.pictures.length > 1 ? 'many' : ''}` });
    body.append(strip);
    const imgs = new Map<string, HTMLImageElement>();
    f.pictures.forEach((p, i) => {
      const img = h('img', { class: 'detail-pic', alt: `${p.kind === 'photo' ? 'Photo' : 'Drawing'} ${i + 1} of ${f.pictures.length}` });
      if (i === 0 && f.thumb) img.src = blobUrl(f.thumb, img);
      strip.append(img);
      imgs.set(p.id, img);
    });
    // The pictures themselves are read only now, as Field Mapper's getFeaturePhotos does.
    void host.media(f.id).then(m => {
      for (const p of m.pictures) {
        const img = imgs.get(p.id);
        if (img) img.src = blobUrl(p.blob, img);
      }
    });
    if (f.pictures.length > 1) body.append(h('p', { class: 'hint center' }, `👉 Swipe to see all ${f.pictures.length} pictures`));
  } else if (f.species && artFor(f.species.name)) {
    const pic = h('div', { class: 'detail-emoji art-pic', style: `--cat:${cat.colour}` });
    pic.innerHTML = artFor(f.species.name)!.svg();
    body.append(pic);
  } else {
    const pic = kindIcon(cat, 'detail-emoji');
    pic.style.setProperty('--cat', cat.colour);
    body.append(pic);
  }
  const facts: HTMLElement[] = [h('li', {}, `🕒 ${whenWords(f.createdAt)}`)];
  if (f.species) facts.push(h('li', {}, `${f.species.own ? '✏️' : '📚'} ${f.species.name}`, f.species.scientific ? h('span', { class: 'latin' }, ` ${f.species.scientific}`) : null));
  const art = f.species ? artFor(f.species.name) : undefined;
  const sign = SIGNS.find(x => x.id === f.sign);
  if (sign) facts.push(h('li', {}, `${sign.emoji} ${sign.label}`));
  if (f.colours.length) {
    facts.push(h('li', { class: 'colour-dots' }, '🎨 ', ...f.colours.map(c => {
      const col = COLOURS.find(x => x.id === c)!;
      return h('span', { class: 'dot', style: `--sw:${col.hex}`, title: col.label, 'aria-label': col.label });
    })));
  }
  const size = SIZES.find(s => s.id === f.size);
  if (size) facts.push(h('li', {}, `${size.emoji} ${size.label}`));
  const cnt = COUNTS.find(s => s.id === f.count);
  if (cnt) facts.push(h('li', {}, `${cnt.emoji} ${cnt.label}`));
  body.append(h('ul', { class: 'detail-facts' }, ...facts));
  if (art) {
    const fig = h('span', { class: 'art-fig', 'aria-hidden': 'true' });
    fig.innerHTML = art.svg();
    body.append(h('div', { class: 'talk-card art-card' }, fig, h('div', {}, h('h3', {}, `How to tell a ${art.label}`), h('p', {}, art.tell))));
  }

  if (f.hasVoice) {
    // One button per voice note; the notes themselves are read only when one is played.
    const count = f.voiceCount ?? 1;
    let playing: HTMLAudioElement | null = null;
    for (let i = 0; i < count; i++) {
      const play = h('button', { class: 'big-btn' }, count > 1 ? `▶️ Listen to story ${i + 1}` : '▶️ Listen to my story');
      play.addEventListener('click', async () => {
        const voice = (await host.media(f.id)).voices[i];
        if (!voice) return;
        playing?.pause();
        const url = URL.createObjectURL(voice);
        const a = new Audio(url);
        playing = a;
        a.onended = () => URL.revokeObjectURL(url);
        void a.play();
      });
      body.append(play);
    }
  }
  if (together) {
    if (f.note) body.append(h('div', { class: 'talk-card' }, h('h3', {}, '✏️ Our note'), h('p', {}, f.note)));
    body.append(h('div', { class: 'talk-card' }, h('h3', {}, '💬 Talk about it'), h('ul', {}, ...cat.talk.map(t => h('li', {}, t)))));
    if (typeof f.lat === 'number' && typeof f.lon === 'number') {
      body.append(h('p', { class: 'hint' }, `📍 ${f.lat.toFixed(5)}, ${f.lon!.toFixed(5)}${f.accuracy ? ` (±${f.accuracy} m)` : ''}`));
    }
  }
  body.append(crewSays('owl', { text: `Hoo! Did you know? ${cat.facts[0]}`, pose: 'point' }, { quiet: true }));

  const fav = h('button', { class: 'big-btn soft' }, f.favourite ? '💔 Not a favourite' : '❤️ Favourite');
  fav.addEventListener('click', async () => {
    f.favourite = !f.favourite;
    await host.update(f);
    fav.textContent = f.favourite ? '💔 Not a favourite' : '❤️ Favourite';
    if (f.favourite) { sounds.pick(); say('One of my favourites!'); }
    onChange?.();
  });
  const row = h('div', { class: 'ask-row' }, fav,
    h('button', { class: 'big-btn soft', onclick: () => { close(); host.editFind(f); } }, '✏️ Change it'));
  body.append(row);
  if (typeof f.lat === 'number') {
    body.append(h('button', { class: 'big-btn soft', onclick: () => { document.querySelectorAll('.sheet').forEach(x => x.remove()); host.showOnMap(f); } }, '🗺️ Show on map'));
  }
  if (f.editedAt) body.append(h('p', { class: 'hint center' }, `Changed ${whenWords(f.editedAt).toLowerCase()}`));
  const del = h('button', { class: 'text-btn danger' }, '🗑️ Throw away this find');
  del.addEventListener('click', async () => {
    const ok = together
      ? await askYesNo('Throw this find away? It cannot come back.', '🗑️ Yes', 'Keep it')
      : await askGrownUp('Throwing away a find cannot be undone.');
    if (!ok) return;
    await host.remove(f);
    close();
    onChange?.();
  });
  body.append(del);
  say(f.nickname ? `${f.nickname}, ${oneOf(cat)}` : fullName(cat));
}

export function openBadges(host: ScreenHost): void {
  const { body } = openSheet({ title: 'My Badges', emoji: '🏅', className: 'badges' });
  const list = badgeProgress(host.finds().map(toBadgeFind), undefined, host.badgeExtras());
  const earned = list.filter(b => b.earned).length;
  body.append(crewSays('moose', {
    text: earned ? `You have ${earned} of ${list.length} badges! Tap one to hear how to get it.` : 'No badges yet. Tap one to hear how to get it!',
    pose: earned ? 'excited' : 'point',
  }));
  const grid = h('div', { class: 'badge-grid' });
  for (const b of list) {
    const pct = Math.round((b.value / b.target) * 100);
    grid.append(h('button', {
      class: `badge ${b.earned ? 'earned' : ''}`, style: `--pct:${pct}`,
      onclick: () => say(b.earned ? `${b.title}! You earned it!` : `${b.title}. ${b.how} You have ${b.value} of ${b.target}.`),
    },
      h('span', { class: 'badge-ring' }, h('span', { class: 'badge-emoji' }, b.emoji)),
      h('strong', {}, b.title),
      h('span', { class: 'badge-how' }, b.earned ? 'Earned!' : `${b.value} / ${b.target}`),
    ));
  }
  body.append(grid);
}

export function todaysChallenges(finds: Find[]): { list: Challenge[]; done: Set<string> } {
  const day = localDay(new Date().toISOString());
  const list = challengesFor(day);
  const done = completedChallenges(list, finds.filter(f => localDay(f.createdAt) === day).map(toBadgeFind));
  return { list, done };
}

export function openChallenges(host: ScreenHost): void {
  const { body, close } = openSheet({ title: "Today's Adventure", emoji: '⭐', className: 'challenges' });
  const { list, done } = todaysChallenges(host.finds());
  body.append(crewSays('raccoon', done.size === list.length
    ? { text: 'You did them all! Amazing!', pose: 'success' }
    : { text: `Bandit here! I hid three challenges for you today. ${list.map(c => c.text).join('. ')}.`, pose: 'point' }));
  for (const c of list) {
    const isDone = done.has(c.id);
    body.append(h('button', { class: `challenge-card ${isDone ? 'done' : ''}`, onclick: () => say(isDone ? `Done! ${c.text}` : c.text) },
      h('span', { class: 'challenge-emoji' }, c.emoji),
      h('span', { class: 'challenge-text' }, c.text),
      h('span', { class: 'challenge-tick' }, isDone ? '✅' : '⬜'),
    ));
  }
  body.append(
    h('p', { class: 'hint' }, '🌙 New challenges come every day.'),
    h('button', { class: 'big-btn', onclick: () => { close(); host.startCapture(); } }, '✨ I found something!'),
    h('button', { class: 'big-btn soft', onclick: () => { close(); host.openHunts(); } }, '🔎 Go on a scavenger hunt'),
  );
  if (done.size === list.length) confetti(['⭐']);
}

/** Meet the crew: who looks after what. */
export function openCrew(host: ScreenHost): void {
  const { body } = openSheet({ title: 'My Explorer Crew', emoji: '🌲', className: 'crew' });
  const g = host.profile.guide;
  body.append(buddySays(g, { text: `I am ${nameOf(activeGuide(g))}, your guide! Meet the crew. Tap anyone to say hi.`, pose: 'hello' }));
  const grid = h('div', { class: 'crew-grid' });
  for (const c of CRITTERS) {
    const m = CAST[c];
    const card = h('button', { class: 'crew-card', onclick: () => {
      say(m.intro.replace(m.name, nameOf(c)), c);
      const fig = card.querySelector('.crew-fig') as HTMLElement;
      fig.innerHTML = critterSvg(c, 'excited');
      setTimeout(() => { fig.innerHTML = critterSvg(c, 'hello'); }, 1800);
    } }, critterFigure(c, 'hello', 'buddy-fig crew-fig'), h('strong', {}, nameOf(c)), h('span', { class: 'crew-role' }, m.role), h('span', { class: 'crew-home' }, m.home), c === g ? h('span', { class: 'crew-yours' }, '⭐ Your guide') : null);
    grid.append(card);
  }
  body.append(grid);
}
