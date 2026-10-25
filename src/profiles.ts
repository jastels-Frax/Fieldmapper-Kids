import type { GuideId, Mode, Profile } from './types.ts';
import { AVATARS } from './categories.ts';
import { blobUrl, h, openSheet, toast, uid, askYesNo } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { downscale } from './image.ts';
import { GUIDES, GUIDE_INFO, guideName, isCrew, journalGuideOn } from './guides.ts';
import { guideFigure, crewSays, buddySays } from './buddyView.ts';
import { CAST } from './cast.ts';
import { askGrownUp } from './gateView.ts';
import { MODE_WORDS, TIERS, tierOf, type TierId } from './tiers.ts';
import { AVATAR_ART, cardPicture } from './avatarArt.ts';
import { artUrl } from './avatars.ts';

export const MODE_INFO: Record<Mode, { emoji: string; title: string; text: string }> = {
  explorer: {
    emoji: MODE_WORDS.explorer.emoji,
    title: MODE_WORDS.explorer.title,
    text: 'A child exploring on their own. Everything read aloud, very little typing. Deleting finds and settings need a grown-up.',
  },
  together: {
    emoji: MODE_WORDS.together.emoji,
    title: MODE_WORDS.together.title,
    text: 'A child and a grown-up exploring side by side. Adds questions to talk about, a note for each find, and exact locations.',
  },
};

/** Big cards for choosing an age tier. `pick` returns false to refuse (a grown-up said no). */
/** `current` null = nothing chosen yet (the welcome), so every card is a real choice. */
export function tierPicker(current: TierId | null, pick: (t: TierId) => Promise<boolean> | boolean): HTMLElement {
  const wrap = h('div', { class: 'mode-pick tier-pick' });
  let now = current;
  const paint = () => wrap.replaceChildren(...TIERS.map(t => h('button', {
    class: `mode-card ${now === t.id ? 'on' : ''}`, 'aria-pressed': String(now === t.id),
    onclick: async () => {
      if (now === t.id) return;
      if (!(await pick(t.id))) return;
      now = t.id;
      say(`${t.label}. ${t.blurb}`);
      paint();
    },
  }, h('span', { class: 'mode-emoji' }, t.emoji), h('strong', {}, `${t.label} · ${t.ages}`), h('span', {}, t.blurb))));
  paint();
  return wrap;
}

export function newProfile(): Profile {
  return { id: uid(), name: '', avatar: AVATARS[0], mode: 'explorer', guide: 'frog', createdAt: new Date().toISOString() };
}

/** The explorer's face: their photo if they have one, else their emoji. */
export function profileFace(p: Profile, cls = 'face'): HTMLElement {
  const pic = cardPicture(p);
  if (pic.kind === 'photo') {
    const img = h('img', { class: `${cls} face-photo`, alt: p.name || 'Explorer' });
    queueMicrotask(() => { img.src = blobUrl(p.photo!, img); });
    return img;
  }
  if (pic.kind === 'art') return h('img', { class: `${cls} face-photo face-art`, alt: p.name || 'Explorer', src: artUrl(pic.art) ?? '' });
  return h('span', { class: `${cls} face-emoji`, 'aria-label': p.name || 'Explorer' }, pic.emoji);
}

/** A round storybook portrait to choose. */
function artButton(id: string, label: string, on: boolean, onclick: () => void): HTMLElement {
  return h('button', { class: `art-avatar ${on ? 'on' : ''}`, 'aria-label': label, 'aria-pressed': String(on), title: label, onclick },
    h('img', { src: artUrl(id) ?? '', alt: '' }));
}

/** The editable parts of a profile, as form sections. `onChange` hears every edit. */
function profileForm(p: Profile, opts: { showMode: boolean; lockMode?: (to: Mode) => Promise<boolean> }): HTMLElement {
  const wrap = h('div', { class: 'profile-form' });

  // Who is using it
  if (opts.showMode) {
    const modes = h('div', { class: 'mode-pick' });
    const paintModes = () => modes.replaceChildren(...(Object.keys(MODE_INFO) as Mode[]).map(m => {
      const info = MODE_INFO[m];
      return h('button', { class: `mode-card ${p.mode === m ? 'on' : ''}`, onclick: async () => {
        if (p.mode === m) return;
        if (opts.lockMode && !(await opts.lockMode(m))) return;
        p.mode = m;
        paintModes();
      } }, h('span', { class: 'mode-emoji' }, info.emoji), h('strong', {}, info.title), h('span', {}, info.text));
    }));
    paintModes();
    wrap.append(
      h('h2', { class: 'section-title' }, 'Age'),
      tierPicker(tierOf(p.tier).id, async t => {
        if (opts.lockMode && !(await askGrownUp('Choosing the age level is for grown-ups.'))) return false;
        p.tier = t;
        return true;
      }),
      h('h2', { class: 'section-title' }, 'Exploring'),
      modes,
    );
  }

  // Name and about
  const name = h('input', { class: 'text-in big', maxlength: 24, placeholder: 'First name', value: p.name, 'aria-label': "Explorer's first name" }) as HTMLInputElement;
  name.addEventListener('input', () => { p.name = name.value.trim(); });
  const about = h('input', { class: 'text-in', maxlength: 80, placeholder: 'e.g. Loves frogs and puddles', value: p.about ?? '', 'aria-label': 'About me' }) as HTMLInputElement;
  about.addEventListener('input', () => { p.about = about.value.trim() || undefined; });
  wrap.append(
    h('h2', { class: 'section-title' }, 'Me'),
    h('label', { class: 'field' }, h('span', {}, '🧒 My name'), name),
    h('label', { class: 'field' }, h('span', {}, '💬 About me (if you like)'), about),
  );

  // Picture: a photo and/or an emoji
  const preview = h('div', { class: 'face-preview' });
  const paintPreview = () => preview.replaceChildren(profileFace(p, 'face big-face'));
  // Two inputs, because `capture` decides it: with it a phone opens the camera straight away and offers no
  // library; without it, the phone's own chooser opens on the photo library.
  const camera = h('input', { type: 'file', accept: 'image/*', capture: 'user', hidden: true }) as HTMLInputElement;
  const library = h('input', { type: 'file', accept: 'image/*', hidden: true }) as HTMLInputElement;
  const takePicture = async (input: HTMLInputElement) => {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    try {
      p.photo = await downscale(f, 400, 0.85);
      sounds.pick();
      say('Great picture!');
      paintPreview();
      removePhoto.hidden = false;
    } catch { toast('That picture did not work. Try another?'); }
  };
  camera.addEventListener('change', () => void takePicture(camera));
  library.addEventListener('change', () => void takePicture(library));
  const removePhoto = h('button', { class: 'text-btn', hidden: !p.photo, onclick: () => { p.photo = undefined; paintPreview(); paintAvatars(); removePhoto.hidden = true; } }, '✖ Use a picture below instead');
  // Choosing a storybook picture or an animal is choosing it over the photo (nothing is saved until Save).
  const avatars = h('div', { class: 'avatar-row' });
  const artRow = h('div', { class: 'art-avatars' });
  const pickCard = (art: string | undefined, emoji?: string) => {
    p.art = art;
    if (emoji) p.avatar = emoji;
    p.photo = undefined;
    removePhoto.hidden = true;
    sounds.pick();
    say('Nice!');
    paintAvatars();
    paintPreview();
    paintMap();
  };
  const paintAvatars = () => {
    const pic = cardPicture(p);
    artRow.replaceChildren(...AVATAR_ART.map(a => artButton(a.id, a.label, pic.kind === 'art' && pic.art === a.id, () => pickCard(a.id))));
    avatars.replaceChildren(...AVATARS.map(a =>
      h('button', { class: `avatar ${pic.kind === 'emoji' && p.avatar === a ? 'on' : ''}`, 'aria-label': `Choose ${a}`, onclick: () => pickCard(undefined, a) }, a)));
  };

  // On the map: the same picture as the card, or one of its own.
  const mapPick = h('div', { class: 'map-avatar-pick' });
  const paintMap = () => {
    const same = !p.mapAvatar;
    const m = p.mapAvatar;
    mapPick.replaceChildren(
      h('div', { class: 'mode-pick' },
        h('button', { class: `mode-card ${same ? 'on' : ''}`, 'aria-pressed': String(same), onclick: () => { p.mapAvatar = undefined; sounds.pick(); paintMap(); } },
          h('span', { class: 'mode-emoji' }, '🪪'), h('strong', {}, 'Same as my card')),
        h('button', { class: `mode-card ${!same ? 'on' : ''}`, 'aria-pressed': String(!same), onclick: () => {
          if (!p.mapAvatar) p.mapAvatar = { kind: 'emoji', emoji: p.avatar };
          sounds.pick(); paintMap();
        } }, h('span', { class: 'mode-emoji' }, '🗺️'), h('strong', {}, 'Something different'))),
      ...(same ? [] : [
        h('div', { class: 'art-avatars' }, ...AVATAR_ART.map(a => artButton(a.id, a.label, m?.kind === 'art' && m.art === a.id, () => {
          p.mapAvatar = { kind: 'art', art: a.id }; sounds.pick(); say(a.label); paintMap();
        }))),
        h('div', { class: 'avatar-row' }, ...AVATARS.map(a => h('button', {
          class: `avatar ${m?.kind === 'emoji' && m.emoji === a ? 'on' : ''}`, 'aria-label': `Choose ${a} for the map`,
          onclick: () => { p.mapAvatar = { kind: 'emoji', emoji: a }; sounds.pick(); paintMap(); },
        }, a))),
      ]),
    );
  };
  paintAvatars();
  paintPreview();
  paintMap();
  wrap.append(
    h('h2', { class: 'section-title' }, 'My picture'),
    h('div', { class: 'face-row' }, preview,
      h('div', { class: 'face-btns' },
        h('button', { class: 'big-btn soft', onclick: () => camera.click() }, '📸 Take a photo'),
        h('button', { class: 'big-btn soft', onclick: () => library.click() }, '🖼️ From my photos'),
        removePhoto)),
    h('p', { class: 'hint' }, 'Or pick a storybook picture, or an animal:'),
    artRow, avatars, camera, library,
    h('h2', { class: 'section-title' }, 'Me on the map'),
    mapPick,
  );

  // Guide: anyone from the crew, with their own name
  const guides = h('div', { class: 'guide-grid' });
  const gname = h('input', { class: 'text-in', maxlength: 20, placeholder: GUIDE_INFO[p.guide].name, value: p.guideName ?? '', 'aria-label': 'Guide name' }) as HTMLInputElement;
  gname.addEventListener('input', () => { p.guideName = gname.value.trim() || undefined; });
  const paintGuides = () => guides.replaceChildren(...GUIDES.map(g => {
    const info = GUIDE_INFO[g];
    const role = isCrew(g) ? CAST[g].role : 'Explorer buddy';
    return h('button', { class: `buddy-pick ${p.guide === g ? 'on' : ''}`, onclick: () => {
      if (p.guide !== g) { p.guide = g; p.guideName = undefined; gname.value = ''; }
      gname.placeholder = info.name;
      say(`${info.sound}! I am ${info.name} the ${info.species}!`, g);
      paintGuides();
    } }, guideFigure(g, p.guide === g ? 'excited' : 'hello', 'buddy-fig pick-fig'), h('strong', {}, info.name), h('span', {}, `the ${info.species}`), h('span', { class: 'crew-role' }, role));
  }));
  paintGuides();
  wrap.append(
    h('h2', { class: 'section-title' }, 'My guide'),
    h('p', { class: 'hint' }, journalGuideOn()
      ? 'In the Field Journal look, Scout the Survey Squirrel is your guide. Your pick here comes back with any other look.'
      : 'Your guide goes everywhere with you and reads everything aloud.'),
    guides,
    h('label', { class: 'field' }, h('span', {}, '🏷️ Give your guide a new name (if you like)'), gname),
  );
  return wrap;
}

export interface ProfileHost {
  profiles: () => Profile[];
  active: () => Profile | undefined;
  findCount: (profileId: string) => number;
  switchTo: (id: string) => Promise<void>;
  /** Resolves to the copy stored, which a caller that saves again must use (see storage.saveFind). */
  save: (p: Profile) => Promise<Profile>;
  remove: (p: Profile) => Promise<void>;
  openCrew: () => void;
  /** Explorer <-> Together for the active explorer (asks for a grown-up when relaxing the locks). */
  toggleMode: () => Promise<void>;
  /** Colours, buttons, text size, font and motion for the active explorer. */
  openLook: () => void;
  /** "My buttons": the explorer's own map buttons. */
  openButtons: () => void;
  /** "How to use". */
  openHelp: () => void;
}

/** "Who's exploring?": switch explorer, add one, change your own card, meet the crew. */
export function openProfiles(host: ProfileHost): void {
  const { body, close } = openSheet({ title: "Who's exploring?", emoji: '🧭', className: 'profiles' });
  const paint = () => {
    body.replaceChildren();
    const me = host.active();
    if (me) body.append(buddySays(me.guide, { text: `Hi ${me.name || 'Explorer'}! Tap a card to swap explorers.`, pose: 'hello' }));
    const grid = h('div', { class: 'profile-grid' });
    for (const p of host.profiles()) {
      const on = me?.id === p.id;
      const n = host.findCount(p.id);
      grid.append(h('button', { class: `profile-card ${on ? 'on' : ''}`, onclick: async () => {
        if (on) return;
        await host.switchTo(p.id);
        sounds.badge();
        say(`Hi ${p.name || 'Explorer'}!`);
        close();
      } }, profileFace(p, 'face card-face'), h('strong', {}, p.name || 'Explorer'),
        p.about ? h('span', { class: 'profile-about' }, p.about) : null,
        h('span', { class: 'profile-meta' }, `${tierOf(p.tier).emoji} ${tierOf(p.tier).label} · ${n} ${n === 1 ? 'find' : 'finds'} · ${guideName(p.guide, p.guideName)}`),
        on ? h('span', { class: 'crew-yours' }, '⭐ Exploring now') : null));
    }
    body.append(grid);
    if (me) {
      const other: Mode = me.mode === 'explorer' ? 'together' : 'explorer';
      body.append(
        h('p', { class: 'hint center' }, `Exploring ${MODE_WORDS[me.mode].short} ${MODE_WORDS[me.mode].emoji}`),
        h('button', { class: 'big-btn soft', onclick: async () => { await host.toggleMode(); paint(); } },
          `${MODE_WORDS[other].emoji} Switch to ${MODE_WORDS[other].title.toLowerCase()}`),
        h('button', { class: 'big-btn soft', onclick: () => host.openLook() }, '🎨 My look'),
        h('button', { class: 'big-btn soft', onclick: () => host.openButtons() }, '🔧 My buttons'),
        h('button', { class: 'big-btn soft', onclick: () => host.openHelp() }, '❓ How to use'),
        h('button', { class: 'big-btn soft', onclick: () => openProfileEditor(host, me, paint) }, '✏️ Change my card'),
      );
    }
    body.append(
      h('button', { class: 'big-btn soft', onclick: async () => {
        if (!(await askGrownUp('Adding an explorer is for grown-ups.'))) return;
        openProfileEditor(host, newProfile(), paint, true);
      } }, '➕ Add an explorer'),
      h('button', { class: 'big-btn soft', onclick: () => { close(); host.openCrew(); } }, '🌲 Meet the crew'),
    );
  };
  paint();
}

/** One explorer's card, as a form. Switching mode, and deleting, ask for a grown-up. */
export function openProfileEditor(host: ProfileHost, original: Profile, after: () => void, isNew = false): void {
  const p: Profile = { ...original };
  const { body, close } = openSheet({ title: isNew ? 'New explorer' : `${original.name || 'Explorer'}'s card`, emoji: isNew ? '➕' : '✏️', className: 'profile-edit' });
  body.append(
    profileForm(p, { showMode: true, lockMode: isNew ? undefined : async to => to === 'explorer' || askGrownUp('Exploring together is for when a grown-up is beside you.') }),
    h('button', { class: 'big-btn', onclick: async () => {
      if (!p.name) { toast('Type a name first.'); return; }
      await host.save(p);
      sounds.save();
      say(isNew ? `Welcome, ${p.name}!` : 'Saved!');
      close();
      after();
    } }, isNew ? '✅ Add explorer' : '✅ Save'),
  );
  if (!isNew && host.profiles().length > 1) {
    body.append(h('button', { class: 'text-btn danger', onclick: async () => {
      if (!(await askGrownUp(`Deleting ${p.name || 'this explorer'} also deletes their finds and hunts.`))) return;
      if (!(await askYesNo(`Delete ${p.name || 'this explorer'} and all ${host.findCount(p.id)} of their finds? This cannot be undone.`, '🗑️ Delete', 'Keep'))) return;
      await host.remove(original);
      close();
      after();
    } }, `🗑️ Delete ${original.name || 'this explorer'}`));
  }
}

/** The welcome flow's middle: the same form, one page. */
export function welcomeForm(p: Profile): HTMLElement {
  return profileForm(p, { showMode: false });
}

export { crewSays };
