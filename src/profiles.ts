import type { GuideId, Mode, Profile } from './types.ts';
import { AVATARS } from './categories.ts';
import { blobUrl, h, openSheet, toast, uid, askYesNo } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { downscale } from './image.ts';
import { GUIDES, GUIDE_INFO, guideName } from './guides.ts';
import { guideFigure, crewSays, buddySays } from './buddyView.ts';
import { CAST } from './cast.ts';
import { askGrownUp } from './gateView.ts';
import { MODE_WORDS, TIERS, tierOf, type TierId } from './tiers.ts';

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
  if (p.photo) {
    const img = h('img', { class: `${cls} face-photo`, alt: p.name || 'Explorer' });
    queueMicrotask(() => { img.src = blobUrl(p.photo!, img); });
    return img;
  }
  return h('span', { class: `${cls} face-emoji`, 'aria-label': p.name || 'Explorer' }, p.avatar);
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
  const file = h('input', { type: 'file', accept: 'image/*', capture: 'user', hidden: true }) as HTMLInputElement;
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    file.value = '';
    if (!f) return;
    try {
      p.photo = await downscale(f, 400, 0.85);
      sounds.pick();
      paintPreview();
      removePhoto.hidden = false;
    } catch { toast('That picture did not work. Try another?'); }
  });
  const removePhoto = h('button', { class: 'text-btn', hidden: !p.photo, onclick: () => { p.photo = undefined; paintPreview(); removePhoto.hidden = true; } }, '✖ Use my animal instead');
  const avatars = h('div', { class: 'avatar-row' });
  const paintAvatars = () => avatars.replaceChildren(...AVATARS.map(a =>
    h('button', { class: `avatar ${p.avatar === a ? 'on' : ''}`, 'aria-label': `Choose ${a}`, onclick: () => { p.avatar = a; say('Nice!'); paintAvatars(); paintPreview(); } }, a)));
  paintAvatars();
  paintPreview();
  wrap.append(
    h('h2', { class: 'section-title' }, 'My picture'),
    h('div', { class: 'face-row' }, preview,
      h('div', {}, h('button', { class: 'big-btn soft', onclick: () => file.click() }, '📸 Take or pick a photo'), removePhoto)),
    h('p', { class: 'hint' }, 'Pick an animal for the map. A photo shows instead, if there is one.'),
    avatars, file,
  );

  // Guide: anyone from the crew, with their own name
  const guides = h('div', { class: 'guide-grid' });
  const gname = h('input', { class: 'text-in', maxlength: 20, placeholder: GUIDE_INFO[p.guide].name, value: p.guideName ?? '', 'aria-label': 'Guide name' }) as HTMLInputElement;
  gname.addEventListener('input', () => { p.guideName = gname.value.trim() || undefined; });
  const paintGuides = () => guides.replaceChildren(...GUIDES.map(g => {
    const info = GUIDE_INFO[g];
    const role = g === 'rat' || g === 'frog' ? 'Explorer buddy' : CAST[g].role;
    return h('button', { class: `buddy-pick ${p.guide === g ? 'on' : ''}`, onclick: () => {
      if (p.guide !== g) { p.guide = g; p.guideName = undefined; gname.value = ''; }
      gname.placeholder = info.name;
      say(`${info.sound}! I am ${info.name} the ${info.species}!`);
      paintGuides();
    } }, guideFigure(g, p.guide === g ? 'excited' : 'hello', 'buddy-fig pick-fig'), h('strong', {}, info.name), h('span', {}, `the ${info.species}`), h('span', { class: 'crew-role' }, role));
  }));
  paintGuides();
  wrap.append(
    h('h2', { class: 'section-title' }, 'My guide'),
    h('p', { class: 'hint' }, 'Your guide goes everywhere with you and reads everything aloud.'),
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
  save: (p: Profile) => Promise<void>;
  remove: (p: Profile) => Promise<void>;
  openCrew: () => void;
  /** Explorer <-> Together for the active explorer (asks for a grown-up when relaxing the locks). */
  toggleMode: () => Promise<void>;
  /** Colours, buttons, text size, font and motion for the active explorer. */
  openLook: () => void;
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
