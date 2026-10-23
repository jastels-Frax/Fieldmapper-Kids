import type { CategoryId, Find, Settings } from './types.ts';
import { CATEGORIES, COLOURS, COUNTS, SIZES, categoryOf } from './categories.ts';
import { askYesNo, blobUrl, h, openSheet, whenWords } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { confetti } from './confetti.ts';
import { badgeProgress, toBadgeFind, type BadgeProgress } from './badges.ts';
import { challengesFor, completedChallenges, type Challenge } from './challenges.ts';
import { localDay } from './geo.ts';
import { askGrownUp } from './gateView.ts';
import { buddySays, crewSays, critterFigure } from './buddyView.ts';
import { CRITTERS, critterSvg } from './critters.ts';
import { CAST } from './cast.ts';
import { cheer } from './buddyLines.ts';
import type { HuntItem, HuntRun } from './hunts.ts';

export interface ScreenHost {
  settings: Settings;
  finds: () => Find[];
  showOnMap: (f: Find) => void;
  remove: (f: Find) => Promise<void>;
  update: (f: Find) => Promise<void>;
  startCapture: () => void;
  openHunts: () => void;
  huntsCompleted: () => number;
  tickChecks: () => number;
  /** Opens the end-of-adventure tick check. */
  tickCheck: () => void;
}

export interface HuntNews {
  run: HuntRun;
  ticked: HuntItem[];
  completed: boolean;
}

function pictureOf(f: Find, owner: Element, cls: string): HTMLElement {
  const blob = f.thumb ?? f.photo ?? f.drawing;
  const cat = categoryOf(f.category);
  if (blob) {
    const img = h('img', { class: cls, alt: f.nickname || cat.label });
    img.src = blobUrl(blob, owner);
    return img;
  }
  return h('span', { class: `${cls} emoji-pic`, style: `--cat:${cat.colour}`, 'aria-label': cat.label }, cat.emoji);
}

/** After a save: a sticker, a cheer, a fact, and anything newly earned. */
export function celebrate(host: ScreenHost, f: Find, newBadges: BadgeProgress[], newChallenges: Challenge[], locatedOk: boolean, hunt: HuntNews | null): void {
  const cat = categoryOf(f.category);
  const fact = cat.facts[Math.floor(Math.random() * cat.facts.length)];
  const { body, close } = openSheet({ title: 'Hooray!', emoji: '🎉', className: 'celebrate' });
  const sticker = h('div', { class: 'big-sticker', style: `--cat:${cat.colour}` });
  body.append(sticker);
  sticker.append(pictureOf(f, sticker, 'big-sticker-pic'), h('span', { class: 'big-sticker-emoji' }, cat.emoji));
  const what = f.nickname ? `You found ${f.nickname}!` : `You found ${/^[aeiou]/i.test(cat.label) ? 'an' : 'a'} ${cat.label.toLowerCase()}!`;
  const buddy = host.settings.buddy;
  const hooray = cheer(buddy);
  body.append(
    buddySays(buddy, { text: `${hooray.text} ${what}`, pose: hooray.pose }, { quiet: true, big: true }),
    crewSays('owl', { text: `Hoo! Did you know? ${fact}`, pose: 'point' }, { quiet: true }),
  );
  if (!locatedOk) body.append(h('p', { class: 'hint' }, '📍 I could not tell where you were, so this one is not on the map.'));
  if (hunt) {
    for (const i of hunt.ticked) {
      body.append(h('div', { class: 'win-card hunt' }, h('span', { class: 'win-emoji' }, i.emoji), h('p', {}, `Hunt: ${i.text}. Found it!`)));
    }
    if (hunt.completed) {
      body.append(h('div', { class: 'win-card trophy' }, h('span', { class: 'win-emoji' }, '🏆'),
        h('div', {}, h('strong', {}, `You finished the ${hunt.run.hunt.title}!`), h('p', {}, 'A trophy for your shelf!'))));
      if (host.settings.tickReminder) {
        body.append(h('button', { class: 'big-btn tick-btn', onclick: () => { close(); host.tickCheck(); } }, '🕷️ Heading home? Do a tick check'));
      }
    }
  }
  for (const c of newChallenges) {
    body.append(h('div', { class: 'win-card challenge' }, h('span', { class: 'win-emoji' }, '✅'), h('p', {}, `Challenge done: ${c.text}!`)));
  }
  for (const b of newBadges) {
    body.append(h('div', { class: 'win-card' }, h('span', { class: 'win-emoji' }, b.emoji), h('div', {}, h('strong', {}, `New badge: ${b.title}!`), h('p', {}, b.how))));
  }
  body.append(h('div', { class: 'ask-row' },
    h('button', { class: 'big-btn', onclick: () => { close(); host.startCapture(); } }, '✨ Find another'),
    h('button', { class: 'big-btn soft', onclick: close }, '🗺️ Back to the map'),
  ));
  sounds.save();
  confetti([cat.emoji, ...newBadges.map(b => b.emoji), ...(hunt?.completed ? ['🏆'] : [])]);
  const huntWords = hunt ? [...hunt.ticked.map(i => `${i.text}, found it!`), hunt.completed ? `You finished the ${hunt.run.hunt.title}! A trophy for you!` : ''] : [];
  const words = [hooray.text, what, ...huntWords, ...newChallenges.map(c => `Challenge done! ${c.text}.`), ...newBadges.map(b => `You earned the ${b.title} badge!`), `Hoot says: did you know? ${fact}`];
  say(words.join(' '));
  if (newBadges.length || hunt?.completed) setTimeout(() => sounds.badge(), 700);
}

/** The sticker book: every find as a sticker, filtered by kind. */
export function openBook(host: ScreenHost, start?: CategoryId): void {
  const { body, close } = openSheet({ title: 'My Finds', emoji: '📖', className: 'book' });
  let filter: CategoryId | 'all' | 'fav' = start ?? 'all';
  const chips = h('div', { class: 'chips' });
  const grid = h('div', { class: 'sticker-grid' });
  const counts = new Map<string, number>();
  for (const f of host.finds()) counts.set(f.category, (counts.get(f.category) ?? 0) + 1);

  const paint = () => {
    chips.replaceChildren(
      h('button', { class: `chip ${filter === 'all' ? 'on' : ''}`, onclick: () => { filter = 'all'; paint(); } }, `🌍 All ${host.finds().length}`),
      h('button', { class: `chip ${filter === 'fav' ? 'on' : ''}`, onclick: () => { filter = 'fav'; paint(); } }, '❤️'),
      ...CATEGORIES.filter(c => counts.has(c.id)).map(c =>
        h('button', { class: `chip ${filter === c.id ? 'on' : ''}`, style: `--cat:${c.colour}`, onclick: () => { filter = c.id; say(c.label); paint(); } }, `${c.emoji} ${counts.get(c.id)}`)),
    );
    const list = host.finds().filter(f => filter === 'all' || (filter === 'fav' ? f.favourite : f.category === filter));
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
      card.append(pictureOf(f, card, 'sticker-pic'), h('span', { class: 'sticker-emoji' }, cat.emoji),
        h('span', { class: 'sticker-name' }, f.nickname || cat.label));
      if (f.favourite) card.append(h('span', { class: 'sticker-fav' }, '❤️'));
    }
  };
  if (host.finds().length) {
    const n = host.finds().length;
    body.append(crewSays('squirrel', { text: `Acorn here! You have ${n} ${n === 1 ? 'sticker' : 'stickers'}. Tap one to look closer.`, pose: 'excited' }));
  }
  body.append(chips, grid);
  paint();
}

/** One find, large: its picture, its sound, and what was noticed. */
export function openFind(host: ScreenHost, id: string, onChange?: () => void): void {
  const f = host.finds().find(x => x.id === id);
  if (!f) return;
  const together = host.settings.mode === 'together';
  const cat = categoryOf(f.category);
  const { body, close } = openSheet({ title: f.nickname || cat.label, emoji: cat.emoji, className: 'detail' });
  const pic = f.photo ?? f.drawing;
  if (pic) {
    const img = h('img', { class: 'detail-pic', alt: f.nickname || cat.label });
    body.append(img);
    img.src = blobUrl(pic, img);
  } else {
    body.append(h('div', { class: 'detail-emoji', style: `--cat:${cat.colour}` }, cat.emoji));
  }
  const facts: HTMLElement[] = [h('li', {}, `🕒 ${whenWords(f.createdAt)}`)];
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

  if (f.voice) {
    const play = h('button', { class: 'big-btn' }, '▶️ Listen to my story');
    play.addEventListener('click', () => {
      const url = URL.createObjectURL(f.voice!);
      const a = new Audio(url);
      a.onended = () => URL.revokeObjectURL(url);
      void a.play();
    });
    body.append(play);
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
  const row = h('div', { class: 'ask-row' }, fav);
  if (typeof f.lat === 'number') {
    row.append(h('button', { class: 'big-btn soft', onclick: () => { document.querySelectorAll('.sheet').forEach(s => s.remove()); host.showOnMap(f); } }, '🗺️ Show on map'));
  }
  body.append(row);
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
  say(f.nickname ? `${f.nickname}, a ${cat.label.toLowerCase()}` : cat.label);
}

export function openBadges(host: ScreenHost): void {
  const { body } = openSheet({ title: 'My Badges', emoji: '🏅', className: 'badges' });
  const list = badgeProgress(host.finds().map(toBadgeFind), undefined, { huntsCompleted: host.huntsCompleted(), tickChecks: host.tickChecks() });
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
  const buddy = host.settings.buddy;
  body.append(buddySays(buddy, { text: buddy === 'rat' ? 'I am Pip, your buddy! Meet my friends. Tap anyone to say hi.' : 'I am Hop, your buddy! Meet my friends. Tap anyone to say hi.', pose: 'hello' }));
  const grid = h('div', { class: 'crew-grid' });
  for (const c of CRITTERS) {
    const m = CAST[c];
    const card = h('button', { class: 'crew-card', onclick: () => {
      say(m.intro);
      const fig = card.querySelector('.crew-fig') as HTMLElement;
      fig.innerHTML = critterSvg(c, 'excited');
      setTimeout(() => { fig.innerHTML = critterSvg(c, 'hello'); }, 1800);
    } }, critterFigure(c, 'hello', 'buddy-fig crew-fig'), h('strong', {}, m.name), h('span', { class: 'crew-role' }, m.role), h('span', { class: 'crew-home' }, m.home));
    grid.append(card);
  }
  body.append(grid);
}
