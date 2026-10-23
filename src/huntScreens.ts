import type { Settings } from './types.ts';
import { HUNTS, ITEM_LIBRARY, MAX_CUSTOM_ITEMS, huntProgress, makeCustomHunt, type Hunt, type HuntItem, type HuntRun } from './hunts.ts';
import { askYesNo, h, openSheet, toast, uid } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { confetti } from './confetti.ts';
import { buddySays } from './buddyView.ts';
import { BUDDY_NAMES } from './buddies.ts';
import { askGrownUp } from './gateView.ts';

export interface HuntHost {
  settings: Settings;
  runs: () => HuntRun[];
  customHunts: () => Hunt[];
  liveFindIds: () => Set<string>;
  start: (hunt: Hunt) => Promise<void>;
  stop: (run: HuntRun) => Promise<void>;
  saveCustom: (hunt: Hunt) => Promise<void>;
  deleteCustom: (id: string) => Promise<void>;
  startCapture: () => void;
}

export function activeRun(runs: HuntRun[]): HuntRun | undefined {
  return runs.find(r => r.status === 'active');
}

function itemGrid(run: HuntRun | null, hunt: Hunt, live: Set<string>): HTMLElement {
  return h('div', { class: 'hunt-items' }, ...hunt.items.map(i => {
    const done = !!run && !!run.found[i.id] && live.has(run.found[i.id]);
    return h('button', { class: `hunt-item ${done ? 'done' : ''}`, onclick: () => say(done ? `${i.text}. Found it!` : i.text) },
      h('span', { class: 'hunt-item-emoji' }, i.emoji),
      h('span', { class: 'hunt-item-text' }, i.text),
      h('span', { class: 'hunt-item-tick' }, done ? '✅' : '⬜'),
    );
  }));
}

function progressBar(done: number, total: number): HTMLElement {
  return h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': done },
    h('span', { style: `width:${total ? (done / total) * 100 : 0}%` }), h('em', {}, `${done} / ${total}`));
}

/** The hunts: the one under way, the ones to choose from, and the trophies. */
export function openHunts(host: HuntHost): void {
  const { body, close } = openSheet({ title: 'Scavenger Hunts', emoji: '🔎', className: 'hunts' });
  const buddy = host.settings.buddy;
  const paint = () => {
    body.replaceChildren();
    const live = host.liveFindIds();
    const run = activeRun(host.runs());
    if (run) {
      const p = huntProgress(run, live);
      body.append(
        buddySays(buddy, { text: `You are on the ${run.hunt.title}! ${p.total - p.done} more to find.`, pose: 'point' }),
        h('section', { class: 'hunt-now' },
          h('h2', {}, `${run.hunt.emoji} ${run.hunt.title}`),
          progressBar(p.done, p.total),
          itemGrid(run, run.hunt, live),
          h('div', { class: 'ask-row' },
            h('button', { class: 'big-btn', onclick: () => { close(); host.startCapture(); } }, '✨ I found something!'),
            h('button', { class: 'big-btn soft', onclick: async () => {
              if (!(await askYesNo('Stop this hunt? You can start it again later.', '⏹️ Stop', 'Keep hunting'))) return;
              await host.stop(run);
              paint();
            } }, '⏹️ Stop hunt'),
          ),
        ),
      );
    } else {
      body.append(buddySays(buddy, { text: `Pick a hunt and ${buddy === 'frog' ? 'hop' : 'scurry'} off to find everything on the list!`, pose: 'excited' }));
    }

    const all = [...host.customHunts(), ...HUNTS];
    body.append(h('h2', { class: 'section-title' }, run ? 'Other hunts' : 'Pick a hunt'));
    const list = h('div', { class: 'hunt-list' });
    for (const hunt of all) {
      if (run && run.hunt.id === hunt.id) continue;
      const doneCount = host.runs().filter(r => r.status === 'done' && r.hunt.id === hunt.id).length;
      list.append(h('button', { class: `hunt-pick ${hunt.custom ? 'custom' : ''}`, onclick: () => preview(hunt) },
        h('span', { class: 'hunt-pick-emoji' }, hunt.emoji),
        h('span', { class: 'hunt-pick-text' }, h('strong', {}, hunt.title), h('span', {}, `${hunt.items.length} things · ${hunt.where}`)),
        doneCount ? h('span', { class: 'hunt-pick-trophy', 'aria-label': `Finished ${doneCount} times` }, `🏆${doneCount > 1 ? `×${doneCount}` : ''}`) : null,
      ));
    }
    body.append(list);

    const maker = h('button', { class: 'big-btn soft', onclick: async () => {
      if (host.settings.mode !== 'together' && !(await askGrownUp('Grown-ups can make a hunt of their own.'))) return;
      openHuntMaker(host, null, paint);
    } }, '🛠️ Make your own hunt');
    body.append(maker);

    const trophies = host.runs().filter(r => r.status === 'done').sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''));
    if (trophies.length) {
      body.append(h('h2', { class: 'section-title' }, `🏆 Trophy shelf (${trophies.length})`),
        h('div', { class: 'trophy-shelf' }, ...trophies.map(r => h('button', {
          class: 'trophy', onclick: () => say(`${r.hunt.title}, finished ${new Date(r.finishedAt ?? r.startedAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}`),
        }, h('span', { class: 'trophy-cup' }, '🏆'), h('span', { class: 'trophy-emoji' }, r.hunt.emoji), h('span', { class: 'trophy-name' }, r.hunt.title)))));
    }
  };

  const preview = (hunt: Hunt) => {
    const sheet = openSheet({ title: hunt.title, emoji: hunt.emoji, className: 'hunt-preview' });
    sheet.body.append(
      buddySays(buddy, { text: `${hunt.title}! Can you find all ${hunt.items.length}? ${hunt.where}`, pose: 'excited' }),
      itemGrid(null, hunt, new Set()),
      h('button', { class: 'big-btn', onclick: async () => {
        const run = activeRun(host.runs());
        if (run && !(await askYesNo(`Stop the ${run.hunt.title} and start this one?`, '🔎 Start this one', 'Keep the old one'))) return;
        if (run) await host.stop(run);
        await host.start(hunt);
        sounds.badge();
        confetti(['🔎', hunt.emoji]);
        sheet.close();
        paint();
        say(`Let's go! The ${hunt.title} has begun!`);
      } }, '🚀 Start this hunt!'),
    );
    if (hunt.custom) {
      sheet.body.append(
        h('div', { class: 'ask-row' },
          h('button', { class: 'text-btn', onclick: async () => {
            if (host.settings.mode !== 'together' && !(await askGrownUp('Changing a hunt is for grown-ups.'))) return;
            sheet.close();
            openHuntMaker(host, hunt, paint);
          } }, '✏️ Change this hunt'),
          h('button', { class: 'text-btn danger', onclick: async () => {
            if (host.settings.mode !== 'together' && !(await askGrownUp('Deleting a hunt is for grown-ups.'))) return;
            if (!(await askYesNo(`Delete the ${hunt.title}? Trophies already won stay on the shelf.`, '🗑️ Delete', 'Keep it'))) return;
            await host.deleteCustom(hunt.id);
            sheet.close();
            paint();
          } }, '🗑️ Delete'),
        ),
      );
    }
  };

  paint();
}

const HUNT_EMOJIS = ['🗺️', '🏡', '🌳', '🏞️', '🌻', '🐞', '🦆', '🍂', '❄️', '🌧️', '⛺', '🎒'];
const ITEM_EMOJIS = ['⭐', '🌿', '🍂', '🪨', '🐾', '🪶', '🍄', '🌰', '🐌', '🦋', '🧱', '🚪', '🪣', '🎈', '🔶', '🔷'];

/** A grown-up builds a hunt from the ready-made things, or writes their own. */
function openHuntMaker(host: HuntHost, editing: Hunt | null, after: () => void): void {
  const { body, close } = openSheet({ title: editing ? 'Change hunt' : 'Make a hunt', emoji: '🛠️', className: 'hunt-maker' });
  let emoji = editing?.emoji ?? HUNT_EMOJIS[0];
  const chosen: HuntItem[] = editing ? editing.items.map(i => ({ ...i, id: i.id.replace(/-\d+$/, '') })) : [];

  const title = h('input', { class: 'text-in', maxlength: 40, placeholder: 'e.g. Grandma\'s Garden Hunt', value: editing?.title ?? '' }) as HTMLInputElement;
  const emojiRow = h('div', { class: 'avatar-row' });
  const paintEmoji = () => emojiRow.replaceChildren(...HUNT_EMOJIS.map(e =>
    h('button', { class: `avatar ${emoji === e ? 'on' : ''}`, onclick: () => { emoji = e; paintEmoji(); } }, e)));
  paintEmoji();

  const listEl = h('div', { class: 'maker-list' });
  const count = h('p', { class: 'hint' });
  const paintList = () => {
    count.textContent = `${chosen.length} of ${MAX_CUSTOM_ITEMS} things`;
    listEl.replaceChildren(...chosen.map((i, n) => h('div', { class: 'maker-row' },
      h('span', { class: 'hunt-item-emoji' }, i.emoji), h('span', { class: 'maker-text' }, i.text),
      i.rule ? h('span', { class: 'maker-auto', title: 'Ticked automatically by a matching find' }, 'auto') : null,
      h('button', { class: 'round-btn small', 'aria-label': `Remove ${i.text}`, onclick: () => { chosen.splice(n, 1); paintList(); paintPalette(); } }, '✖️'),
    )));
  };

  const palette = h('div', { class: 'hunt-chips' });
  const paintPalette = () => palette.replaceChildren(...ITEM_LIBRARY.map(i => {
    const on = chosen.some(c => c.id === i.id);
    return h('button', { class: `hunt-chip ${on ? 'on' : ''}`, onclick: () => {
      const at = chosen.findIndex(c => c.id === i.id);
      if (at >= 0) chosen.splice(at, 1);
      else if (chosen.length >= MAX_CUSTOM_ITEMS) return toast(`A hunt can have up to ${MAX_CUSTOM_ITEMS} things.`);
      else chosen.push(i);
      paintList();
      paintPalette();
    } }, h('span', { class: 'hunt-chip-emoji' }, i.emoji), i.text);
  }));

  let ownEmoji = ITEM_EMOJIS[0];
  const ownEmojiRow = h('div', { class: 'avatar-row small' });
  const paintOwnEmoji = () => ownEmojiRow.replaceChildren(...ITEM_EMOJIS.map(e =>
    h('button', { class: `avatar ${ownEmoji === e ? 'on' : ''}`, onclick: () => { ownEmoji = e; paintOwnEmoji(); } }, e)));
  paintOwnEmoji();
  const ownText = h('input', { class: 'text-in', maxlength: 40, placeholder: 'e.g. A red door' }) as HTMLInputElement;
  const addOwn = h('button', { class: 'big-btn soft', onclick: () => {
    const text = ownText.value.trim();
    if (!text) return toast('Type the thing to find first.');
    if (chosen.length >= MAX_CUSTOM_ITEMS) return toast(`A hunt can have up to ${MAX_CUSTOM_ITEMS} things.`);
    chosen.push({ id: `own-${uid().slice(0, 8)}`, emoji: ownEmoji, text });
    ownText.value = '';
    paintList();
  } }, '➕ Add it');

  const save = h('button', { class: 'big-btn', onclick: async () => {
    const hunt = makeCustomHunt(editing?.id ?? `custom-${uid()}`, title.value, emoji, chosen);
    if (!hunt) return toast(title.value.trim() ? 'Add at least one thing to find.' : 'Give the hunt a name.');
    await host.saveCustom(hunt);
    close();
    after();
    toast(`${hunt.emoji} ${hunt.title} is ready!`);
  } }, '💾 Save hunt');

  body.append(
    h('p', { class: 'hint' }, `${BUDDY_NAMES[host.settings.buddy]} will read the list aloud. Ready-made things marked "auto" tick themselves when a matching find is saved; your own things are ticked by tapping "it counts" when saving a find.`),
    h('label', { class: 'field' }, h('span', {}, 'Hunt name'), title),
    h('div', { class: 'field' }, h('span', {}, 'Picture'), emojiRow),
    h('h2', { class: 'section-title' }, 'Things to find'), count, listEl,
    h('h2', { class: 'section-title' }, 'Add ready-made things'), palette,
    h('h2', { class: 'section-title' }, 'Add your own'), ownEmojiRow,
    h('div', { class: 'own-row' }, ownText, addOwn),
    save,
  );
  paintList();
  paintPalette();
}
