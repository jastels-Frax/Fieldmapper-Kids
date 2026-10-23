import type { Mode, Settings } from './types.ts';
import { AVATARS } from './categories.ts';
import { askYesNo, h, openSheet, toast } from './ui.ts';
import { buildExport, saveFile } from './exportData.ts';
import { buddyFigure } from './buddyView.ts';
import { BUDDY_NAMES, type Buddy } from './buddies.ts';
import type { Find } from './types.ts';

export interface GrownUpHost {
  settings: Settings;
  finds: () => Find[];
  applySettings: (s: Settings) => Promise<void>;
  deleteAll: () => Promise<void>;
}

export const MODE_INFO: Record<Mode, { emoji: string; title: string; text: string }> = {
  explorer: {
    emoji: '🧒',
    title: 'Explorer mode',
    text: 'For a child exploring on their own. Big pictures, everything read aloud, no typing. Deleting finds and these settings need a grown-up.',
  },
  together: {
    emoji: '👨‍👧',
    title: 'Together mode',
    text: 'For a child and a grown-up exploring side by side. Adds questions to talk about, a name and a note for each find, and exact locations.',
  },
};

/** Settings, export and clean-up: everything a child should not stumble into. */
export function openGrownUps(host: GrownUpHost): void {
  const s: Settings = { ...host.settings };
  const { body, close } = openSheet({ title: 'Grown-up corner', emoji: '🔒', className: 'grownups' });

  const save = async () => { await host.applySettings({ ...s }); };

  const modes = h('div', { class: 'mode-pick' });
  const paintModes = () => {
    modes.replaceChildren(...(Object.keys(MODE_INFO) as Mode[]).map(m => {
      const info = MODE_INFO[m];
      return h('button', { class: `mode-card ${s.mode === m ? 'on' : ''}`, onclick: async () => { s.mode = m; paintModes(); await save(); } },
        h('span', { class: 'mode-emoji' }, info.emoji), h('strong', {}, info.title), h('span', {}, info.text));
    }));
  };
  paintModes();

  const name = h('input', { class: 'text-in', value: s.name, maxlength: 24, placeholder: "Explorer's first name" }) as HTMLInputElement;
  name.addEventListener('change', async () => { s.name = name.value.trim(); await save(); });

  const avatars = h('div', { class: 'avatar-row' });
  const paintAvatars = () => avatars.replaceChildren(...AVATARS.map(a =>
    h('button', { class: `avatar ${s.avatar === a ? 'on' : ''}`, 'aria-label': `Choose ${a}`, onclick: async () => { s.avatar = a; paintAvatars(); await save(); } }, a)));
  paintAvatars();

  const buddies = h('div', { class: 'buddy-picks small' });
  const paintBuddies = () => buddies.replaceChildren(...(['rat', 'frog'] as Buddy[]).map(b =>
    h('button', { class: `buddy-pick ${s.buddy === b ? 'on' : ''}`, onclick: async () => { s.buddy = b; paintBuddies(); await save(); } },
      buddyFigure(b, 'hello', 'buddy-fig pick-fig'), h('strong', {}, BUDDY_NAMES[b]))));
  paintBuddies();

  const toggle = (key: 'readAloud' | 'sounds' | 'trail', label: string) => {
    const box = h('input', { type: 'checkbox' }) as HTMLInputElement;
    box.checked = s[key];
    box.addEventListener('change', async () => { s[key] = box.checked; await save(); });
    return h('label', { class: 'toggle' }, box, h('span', {}, label));
  };

  const finds = host.finds();
  const photos = finds.filter(f => f.photo).length;
  const voices = finds.filter(f => f.voice).length;
  const storage = h('p', { class: 'hint' }, `${finds.length} finds · ${photos} photos · ${voices} voice notes`);
  void navigator.storage?.estimate?.().then(e => {
    if (e.usage) storage.textContent += ` · ${(e.usage / 1048576).toFixed(1)} MB used on this device`;
  });

  const exportBtn = h('button', { class: 'big-btn' }, '📦 Save all finds as a file');
  exportBtn.addEventListener('click', async () => {
    if (!finds.length) return toast('There are no finds to save yet.');
    exportBtn.setAttribute('disabled', '');
    exportBtn.textContent = '📦 Packing…';
    try {
      const blob = await buildExport(host.finds(), s.name);
      const day = new Date().toISOString().slice(0, 10);
      await saveFile(blob, `${(s.name || 'explorer').replace(/[^\w-]+/g, '_')}-finds-${day}.zip`);
    } catch {
      toast('Saving the file did not work.');
    } finally {
      exportBtn.removeAttribute('disabled');
      exportBtn.textContent = '📦 Save all finds as a file';
    }
  });

  const wipe = h('button', { class: 'text-btn danger' }, '🗑️ Delete every find on this device');
  wipe.addEventListener('click', async () => {
    if (!finds.length) return;
    if (!(await askYesNo(`Delete all ${finds.length} finds, their photos and voice notes? This cannot be undone. Save a file first if you want to keep them.`, 'Delete everything', 'Cancel'))) return;
    await host.deleteAll();
    close();
    toast('All finds deleted.');
  });

  body.append(
    h('h2', { class: 'section-title' }, 'Who is exploring?'),
    modes,
    h('label', { class: 'field' }, h('span', {}, 'Name'), name),
    h('div', { class: 'field' }, h('span', {}, 'Explorer picture on the map'), avatars),
    h('div', { class: 'field' }, h('span', {}, 'Buddy'), buddies),
    h('h2', { class: 'section-title' }, 'Sound and map'),
    toggle('readAloud', '🔊 Read words aloud'),
    toggle('sounds', '🎵 Happy sounds'),
    toggle('trail', '👣 Show today\'s walk on the map'),
    h('h2', { class: 'section-title' }, 'Finds'),
    storage, exportBtn, wipe,
    h('h2', { class: 'section-title' }, 'Privacy'),
    h('p', { class: 'hint' },
      'Everything stays on this device: finds, photos, voices, location and walks. There is no account and nothing is uploaded. ' +
      'The map pictures come from OpenFreeMap (OpenStreetMap data), which sees which part of the map is being looked at, as any web map does. ' +
      'Uninstalling the app or clearing the browser\'s site data deletes the finds, so save a file now and then.'),
    h('p', { class: 'hint' }, `Field Mapper Kids ${__APP_VERSION__} · made by Fraxinus`),
  );
}
