import type { Find, Profile, Settings } from './types.ts';
import { askYesNo, h, openSheet, toast, uid } from './ui.ts';
import { buildExport, saveFile } from './exportData.ts';
import { tickHowTo } from './tickScreen.ts';
import { profileFace, openProfileEditor, newProfile, type ProfileHost } from './profiles.ts';
import { guideName } from './guides.ts';
import { parseFieldMapperList, parseSpeciesCsv } from './species.ts';
import { allSpeciesLists, deleteSpeciesList, saveSpeciesList } from './storage.ts';
import { invalidateSpecies, loadSpecies } from './speciesStore.ts';
import { photoCount } from './findModel.ts';

export interface GrownUpHost {
  settings: Settings;
  /** Every explorer's finds. */
  allFinds: () => Find[];
  profiles: ProfileHost;
  applySettings: (s: Settings) => Promise<void>;
  deleteAll: () => Promise<void>;
}

/** Settings, explorers, species lists, export and clean-up: everything a child should not stumble into. */
export function openGrownUps(host: GrownUpHost): void {
  const s: Settings = { ...host.settings };
  const { body, close } = openSheet({ title: 'Grown-up corner', emoji: '🔒', className: 'grownups' });
  const save = async () => { await host.applySettings({ ...s }); };

  // Explorers
  const people = h('div', { class: 'profile-list' });
  const paintPeople = () => {
    people.replaceChildren(...host.profiles.profiles().map(p => h('div', { class: 'maker-row profile-row' },
      profileFace(p, 'face row-face'),
      h('span', { class: 'maker-text' }, h('strong', {}, p.name || 'Explorer'), h('br'),
        h('span', { class: 'hint' }, `${p.mode === 'together' ? 'Together' : 'Explorer'} mode · guide ${guideName(p.guide, p.guideName)} · ${host.profiles.findCount(p.id)} finds`)),
      h('button', { class: 'round-btn small', 'aria-label': `Change ${p.name}`, onclick: () => openProfileEditor(host.profiles, p, paintPeople) }, '✏️'),
    )));
  };
  paintPeople();

  const toggle = (key: 'readAloud' | 'sounds' | 'trail' | 'tickReminder', label: string) => {
    const box = h('input', { type: 'checkbox' }) as HTMLInputElement;
    box.checked = s[key];
    box.addEventListener('change', async () => { s[key] = box.checked; await save(); });
    return h('label', { class: 'toggle' }, box, h('span', {}, label));
  };

  // Species lists
  const lists = h('div', { class: 'profile-list' });
  const paintLists = async () => {
    const [{ list, source }, imported] = await Promise.all([loadSpecies(), allSpeciesLists()]);
    lists.replaceChildren(
      h('div', { class: 'maker-row' }, h('span', { class: 'hunt-item-emoji' }, '🌲'),
        h('span', { class: 'maker-text' }, h('strong', {}, 'Nova Scotia (built in)'), h('br'), h('span', { class: 'hint' }, source || 'From Fraxinus Field Mapper'))),
      ...imported.map(l => h('div', { class: 'maker-row' }, h('span', { class: 'hunt-item-emoji' }, '📄'),
        h('span', { class: 'maker-text' }, h('strong', {}, l.name), h('br'), h('span', { class: 'hint' }, `${l.species.length.toLocaleString()} species · imported ${l.importedAt.slice(0, 10)}`)),
        h('button', { class: 'round-btn small', 'aria-label': `Remove ${l.name}`, onclick: async () => {
          if (!(await askYesNo(`Remove the list "${l.name}"? Finds already named keep their names.`, 'Remove', 'Keep'))) return;
          await deleteSpeciesList(l.id);
          invalidateSpecies();
          void paintLists();
        } }, '✖'))),
      h('p', { class: 'hint' }, `${list.length.toLocaleString()} species to choose from in all.`),
    );
  };
  void paintLists();
  const speciesFile = h('input', { type: 'file', accept: '.json,.csv,application/json,text/csv', hidden: true }) as HTMLInputElement;
  speciesFile.addEventListener('change', async () => {
    const f = speciesFile.files?.[0];
    speciesFile.value = '';
    if (!f) return;
    if (f.size > 20 * 1048576) return toast('That file is too big for a species list.');
    const text = await f.text();
    let parsed: ReturnType<typeof parseFieldMapperList>;
    if (/\.csv$/i.test(f.name)) parsed = parseSpeciesCsv(text);
    else {
      try { parsed = parseFieldMapperList(JSON.parse(text)); } catch { parsed = 'That file is not valid JSON.'; }
    }
    if (typeof parsed === 'string') return toast(parsed, 5000);
    await saveSpeciesList({ id: uid(), name: f.name.replace(/\.(json|csv)$/i, ''), importedAt: new Date().toISOString(), species: parsed });
    invalidateSpecies();
    toast(`📚 Added ${parsed.length.toLocaleString()} species from ${f.name}`);
    void paintLists();
  });

  // Finds
  const finds = host.allFinds();
  const photos = finds.reduce((n, f) => n + photoCount(f), 0);
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
      const blob = await buildExport(host.allFinds(), host.profiles.profiles());
      await saveFile(blob, `scout-finds-${new Date().toISOString().slice(0, 10)}.zip`);
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
    if (!(await askYesNo(`Delete all ${finds.length} finds, of every explorer, with their photos and voice notes? This cannot be undone. Save a file first if you want to keep them.`, 'Delete everything', 'Cancel'))) return;
    await host.deleteAll();
    close();
    toast('All finds deleted.');
  });

  body.append(
    h('h2', { class: 'section-title' }, 'Explorers'),
    people,
    h('button', { class: 'big-btn soft', onclick: () => openProfileEditor(host.profiles, newProfile(), paintPeople, true) }, '➕ Add an explorer'),
    h('h2', { class: 'section-title' }, 'Sound and map'),
    toggle('readAloud', '🔊 Read words aloud'),
    toggle('sounds', '🎵 Happy sounds'),
    toggle('trail', '👣 Show today\'s walk on the map'),
    toggle('tickReminder', '🕷️ Offer a tick check when a hunt ends'),
    h('p', { class: 'hint' }, 'The 🏠 button on the map starts a tick check any time. The 🛰️ button switches between streets, satellite and hybrid.'),
    tickHowTo(),
    h('h2', { class: 'section-title' }, 'Species lists'),
    h('p', { class: 'hint' }, 'Explorers can name what they found from these lists. Add another Field Mapper species file (db-….json, e.g. another province) or a CSV of common name, scientific name, taxon.'),
    lists,
    h('button', { class: 'big-btn soft', onclick: () => speciesFile.click() }, '📥 Import a species list'),
    speciesFile,
    h('h2', { class: 'section-title' }, 'Finds'),
    storage, exportBtn, wipe,
    h('h2', { class: 'section-title' }, 'Privacy'),
    h('p', { class: 'hint' },
      'Everything stays on this device: explorers, finds, photos, voices, location and walks. There is no account and nothing is uploaded. ' +
      'The map pictures come from OpenFreeMap (OpenStreetMap data) and, for satellite views, Esri World Imagery; those services see which part of the map is being looked at, as any web map does. ' +
      'Uninstalling the app or clearing the browser\'s site data deletes the finds, so save a file now and then.'),
    h('p', { class: 'hint' }, `Scout ${__APP_VERSION__} · made by Fraxinus`),
  );
}

export type { Profile };
