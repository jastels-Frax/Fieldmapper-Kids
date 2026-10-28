import { icon } from './icons.ts';
import { openHelp } from './help.ts';
import { openWhatsNew } from './launch.ts';
import type { Find, GuideId, Profile, Settings } from './types.ts';
import { askYesNo, h, openSheet, toast, uid } from './ui.ts';
import { buildExport, saveFile } from './exportData.ts';
import { tickHowTo } from './tickScreen.ts';
import { profileFace, openProfileEditor, newProfile, type ProfileHost } from './profiles.ts';
import { GUIDE_INFO, guideName } from './guides.ts';
import { CRITTERS } from './critters.ts';
import { tierOf } from './tiers.ts';
import { parseFieldMapperList, parseSpeciesCsv } from './species.ts';
import { allSpeciesLists, deleteSpeciesList, getFindMedia, saveSpeciesList } from './storage.ts';
import { invalidateSpecies, loadSpecies } from './speciesStore.ts';
import { photoCount } from './findModel.ts';
import type { Walk } from './walk.ts';
import { availableVoices, characterVoice, currentVoice, preview, previewCharacter } from './speech.ts';
import { englishVoices, voiceScore } from './voiceRank.ts';

export interface GrownUpHost {
  settings: Settings;
  /** Every explorer's finds. */
  allFinds: () => Find[];
  allWalks: () => Walk[];
  allSketches: () => import('./types.ts').Sketch[];
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
        h('span', { class: 'hint' }, `${tierOf(p.tier).emoji} ${tierOf(p.tier).label} · ${p.mode === 'together' ? 'together' : 'on my own'} · guide ${guideName(p.guide, p.guideName)} · ${host.profiles.findCount(p.id)} finds`)),
      h('button', { class: 'round-btn small', 'aria-label': `Change ${p.name}`, onclick: () => openProfileEditor(host.profiles, p, paintPeople) }, '✏️'),
    )));
  };
  paintPeople();

  const toggle = (key: 'readAloud' | 'sounds' | 'trail' | 'tickReminder' | 'pathRecording' | 'walksOnMap' | 'keepAwake' | 'wakeLock', label: string) => {
    const box = h('input', { type: 'checkbox' }) as HTMLInputElement;
    box.checked = s[key];
    box.addEventListener('change', async () => { s[key] = box.checked; if (key === 'trail') s.trailChosen = true; if (key === 'readAloud') s.readAloudChosen = true; await save(); });
    return h('label', { class: 'toggle' }, box, h('span', {}, label));
  };

  // Voice
  const voiceList = h('div', { class: 'profile-list' });
  const sample = "Hi! Let's go exploring and see what we can find!";
  const paintVoices = () => {
    const list = englishVoices(availableVoices()).sort((a, b) => voiceScore(b) - voiceScore(a));
    const now = currentVoice();
    const setMode = async (m: Settings['voiceMode']) => { s.voiceMode = m; await save(); paintVoices(); };
    const modeRow = (m: Settings['voiceMode'], emoji: string, title: string, hint: string) =>
      h('button', { class: `mode-card ${s.voiceMode === m ? 'on' : ''}`, 'aria-pressed': String(s.voiceMode === m), onclick: () => void setMode(m) },
        h('strong', {}, `${emoji} ${title}`), h('span', {}, hint));
    const modes = h('div', { class: 'mode-pick' },
      modeRow('characters', '🎭', 'Every character has their own voice', 'Hop, Pip, Scout and the crew each sound different. Uses the voices on this device, with their own pitch and pace.'),
      modeRow('one', '🗣️', 'One voice for everyone', 'Everyone speaks in the same voice. Pick it below.'));
    if (s.voiceMode === 'characters') {
      const who: GuideId[] = ['frog', 'rat', 'scout', ...CRITTERS];
      voiceList.replaceChildren(modes, ...who.map(g => h('div', { class: 'maker-row' }, h('span', { class: 'hunt-item-emoji' }, '🎭'),
        h('span', { class: 'maker-text' }, h('strong', {}, GUIDE_INFO[g].name), h('br'), h('span', { class: 'hint' }, characterVoice(g)?.name ?? 'The device voice')),
        h('button', { class: 'round-btn small', 'aria-label': `Hear ${GUIDE_INFO[g].name}`, onclick: () => previewCharacter(`Hi! I am ${GUIDE_INFO[g].name}. Let's go exploring!`, g) }, '▶️'))),
        list.length ? h('span') : h('p', { class: 'hint' }, 'This device has no English speech voices installed.'));
      return;
    }
    voiceList.replaceChildren(modes,
      h('div', { class: 'maker-row' }, h('span', { class: 'hunt-item-emoji' }, '✨'),
        h('span', { class: 'maker-text' }, h('strong', {}, 'Best voice on this device'), h('br'), h('span', { class: 'hint' }, now && !s.voiceURI ? `Using ${now.name}` : 'Picked automatically')),
        h('button', { class: `round-btn small ${!s.voiceURI ? 'on' : ''}`, 'aria-label': 'Use the best voice', onclick: async () => { s.voiceURI = undefined; await save(); paintVoices(); speakSample(); } }, !s.voiceURI ? '✅' : '○')),
      ...list.slice(0, 12).map(v => h('div', { class: 'maker-row' }, h('span', { class: 'hunt-item-emoji' }, '🗣️'),
        h('span', { class: 'maker-text' }, h('strong', {}, v.name), h('br'), h('span', { class: 'hint' }, `${v.lang}${v.localService ? '' : ' · needs internet'}`)),
        h('button', { class: 'round-btn small', 'aria-label': `Hear ${v.name}`, onclick: () => preview(sample, v) }, '▶️'),
        h('button', { class: 'round-btn small', 'aria-label': `Use ${v.name}`, onclick: async () => { s.voiceURI = v.voiceURI; await save(); paintVoices(); } }, s.voiceURI === v.voiceURI ? '✅' : '○'))),
      list.length ? h('span') : h('p', { class: 'hint' }, 'This device has no English speech voices installed.'),
    );
  };
  const speakSample = () => { const v = currentVoice(); if (v) preview(sample, v); };
  paintVoices();
  window.speechSynthesis?.addEventListener?.('voiceschanged', paintVoices);

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
        } }, icon('close')))),
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
  const voices = finds.reduce((n, f) => n + (f.voiceCount ?? (f.hasVoice ? 1 : 0)), 0);
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
      const blob = await buildExport(host.allFinds(), host.profiles.profiles(), host.allWalks(), getFindMedia, host.allSketches());
      await saveFile(blob, `scout-finds-${new Date().toISOString().slice(0, 10)}.zip`);
    } catch {
      toast('Saving the file did not work.');
    } finally {
      exportBtn.removeAttribute('disabled');
      exportBtn.textContent = '📦 Save all finds as a file';
    }
  });
  const wipe = h('button', { class: 'text-btn danger' }, '🗑️ Delete every find and path on this device');
  wipe.addEventListener('click', async () => {
    if (!finds.length) return;
    if (!(await askYesNo(`Delete all ${finds.length} finds and recorded paths, of every explorer, with their photos and voice notes? This cannot be undone. Save a file first if you want to keep them.`, 'Delete everything', 'Cancel'))) return;
    await host.deleteAll();
    close();
    toast('All finds deleted.');
  });

  body.append(
    h('h2', { class: 'section-title' }, 'Explorers'),
    people,
    h('button', { class: 'big-btn soft', onclick: () => openProfileEditor(host.profiles, newProfile(), paintPeople, true) }, '➕ Add an explorer'),
    h('h2', { class: 'section-title' }, 'Sound and map'),
    toggle('readAloud', '🔊 Read words aloud as they appear (a tapped speech bubble is always read)'),
    toggle('sounds', '🎵 Happy sounds'),
    toggle('trail', '👣 Record today\'s walk automatically, even when Path is off'),
    toggle('tickReminder', '🕷️ Offer a tick check when a hunt ends'),
    h('p', { class: 'hint' }, 'The 🏠 Done button on the map starts a tick check any time. The 🗺️ Map button switches between streets, satellite and hybrid, and holds the facing arrow and Keep the screen on. 📸 Quick finds (one tap: a photo, saved) are off until an explorer turns them on in 🔧 My buttons.'),
    tickHowTo(),
    h('h2', { class: 'section-title' }, 'Recording paths'),
    toggle('pathRecording', '👣 Show the Record my path button'),
    toggle('walksOnMap', '🟣 Show saved paths on the map'),
    toggle('keepAwake', '💡 Keep the screen on while a path records'),
    toggle('wakeLock', '💡 Keep the screen on whenever Scout is open (also on the 🗺️ Map card)'),
    h('p', { class: 'hint' }, 'Phones and tablets stop reading the GPS when the screen goes off, so a path only records while Scout is open on the screen. Keeping the screen on uses more battery. Paths stay on this device like everything else.'),
    h('h2', { class: 'section-title' }, 'Voice'),
    h('p', { class: 'hint' }, 'Scout reads aloud with the voices built into this device, so nothing is sent anywhere. Tap ▶️ to hear one. For more natural voices, download an "Enhanced" or "Premium" English voice in the device settings (iPhone/iPad: Settings › Accessibility › Spoken Content › Voices; Android: Settings › Text-to-speech › Google › Install voice data), then come back here.'),
    voiceList,
    h('h2', { class: 'section-title' }, 'Species lists'),
    h('p', { class: 'hint' }, 'Explorers can name what they found from these lists. Add another Field Mapper species file (db-….json, e.g. another province) or a CSV of common name, scientific name, taxon.'),
    lists,
    h('button', { class: 'big-btn soft', onclick: () => speciesFile.click() }, '📥 Import a species list'),
    speciesFile,
    h('h2', { class: 'section-title' }, 'Finds'),
    storage, exportBtn, wipe,
    h('h2', { class: 'section-title' }, 'Privacy'),
    h('p', { class: 'hint' },
      'Everything stays on this device: explorers, finds, photos, voices, location, walks and recorded paths. There is no account and nothing is uploaded. ' +
      'The map pictures come from OpenFreeMap (OpenStreetMap data) and, for satellite views, Esri World Imagery; those services see which part of the map is being looked at, as any web map does. ' +
      'Uninstalling the app or clearing the browser\'s site data deletes the finds, so save a file now and then.'),
    h('p', { class: 'hint' }, `Scout ${__APP_VERSION__} · made by Fraxinus`),
    h('div', { class: 'ask-row' },
      h('button', { class: 'big-btn soft', onclick: () => openHelp(host.profiles.active()?.guide ?? 'frog') }, '❓ How to use'),
      h('button', { class: 'big-btn soft', onclick: () => { const me = host.profiles.active(); if (me) openWhatsNew(me); } }, "✨ What's new")),
  );
}

export type { Profile };
