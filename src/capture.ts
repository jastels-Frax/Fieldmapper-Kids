import type { CategoryId, ColourId, Find, Picture, Profile, Settings, SpeciesPick } from './types.ts';
import { CATEGORIES, COLOURS, COUNTS, SIGNS, SIZES, categoryOf } from './categories.ts';
import { askYesNo, blobUrl, h, openSheet, toast, uid } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { downscale } from './image.ts';
import { drawPad } from './drawPad.ts';
import { voiceControl } from './voice.ts';
import { accuracyWords, bestFix, lastFix, type Fix } from './gps.ts';
import { buddySays } from './buddyView.ts';
import { stepLine } from './buddyLines.ts';
import type { Expression } from './buddies.ts';
import { meetsRule, type HuntItem } from './hunts.ts';
import { toBadgeFind } from './badges.ts';
import { hasSpeciesStep, searchSpecies, type Species } from './species.ts';
import { FAMILIAR } from './familiar.ts';
import { loadSpecies } from './speciesStore.ts';
import { artFor } from './sproutArt.ts';

export interface CaptureHost {
  settings: Settings;
  profile: Profile;
  /** The active scavenger hunt's open items, if a hunt is on. */
  hunt: () => { title: string; emoji: string; open: HuntItem[] } | null;
  save: (f: Find, huntItems: string[]) => Promise<void>;
  /** Saves a change to a find that already exists. */
  update: (f: Find) => Promise<void>;
  /** Lets the explorer put the find on the map by hand. */
  pickOnMap: (start?: { lat: number; lon: number }) => Promise<{ lat: number; lon: number } | null>;
}

type Step = 'picture' | 'category' | 'sign' | 'species' | 'colours' | 'size' | 'count' | 'where' | 'tell';

export const MAX_PICTURES = 12;

/**
 * "I found something!" — one step per screen, big buttons, everything skippable
 * but the kind of thing. Passing `existing` edits a saved find instead: same id,
 * same place and time, with every answer pre-filled.
 */
export function startCapture(host: CaptureHost, existing?: Find): void {
  const together = host.profile.mode === 'together';
  const guide = host.profile.guide;
  const editing = !!existing;
  // The place is taken when the explorer says "I found something", not after they finish drawing.
  let fix: Fix | null = editing ? null : lastFix();
  /** Where the find goes: GPS, a tapped spot, kept as it was (editing), or nowhere. */
  type Place = { kind: 'gps' } | { kind: 'map'; lat: number; lon: number } | { kind: 'keep' } | { kind: 'none' };
  let place: Place = editing ? (typeof existing!.lat === 'number' ? { kind: 'keep' } : { kind: 'none' }) : (fix ? { kind: 'gps' } : { kind: 'none' });
  const draft: Partial<Find> & { colours: ColourId[]; pictures: Picture[] } = existing
    ? { ...existing, colours: [...existing.colours], pictures: [...existing.pictures] }
    : { colours: [], pictures: [] };
  let stepIdx = 0;
  let pad: ReturnType<typeof drawPad> | null = null;
  let huntPicks: Set<string> | null = null;

  const steps = (): Step[] => {
    const s: Step[] = ['picture', 'category'];
    if (draft.category === 'sign') s.push('sign');
    if (draft.category && hasSpeciesStep(draft.category)) s.push('species');
    s.push('colours', 'size', 'count', 'where', 'tell');
    return s;
  };

  const { body, close, sheet } = openSheet({ title: editing ? 'Change my find' : 'I found something!', emoji: editing ? '✏️' : '✨', className: 'capture' });
  const back = sheet.querySelector('.back-btn') as HTMLButtonElement;
  back.replaceWith(back.cloneNode(true));
  (sheet.querySelector('.back-btn') as HTMLButtonElement).addEventListener('click', async () => {
    if (editing) {
      // Inside one question, back means "back to my find"; from the summary it means leave.
      if (!onOverview) return overview();
      if (!changed() || (await askYesNo('Stop without saving the changes?', '↩️ Yes, stop', '✏️ Keep changing'))) close();
      return;
    }
    if (stepIdx === 0 && !draft.pictures.length) return close();
    if (await askYesNo('Stop and throw this find away?', '🗑️ Yes', '✨ Keep going')) close();
  });
  const dots = h('div', { class: 'step-dots', 'aria-hidden': 'true', hidden: editing });
  sheet.querySelector('.sheet-head')!.append(dots);

  // Editing opens on a summary of the find; each row opens ONE question and comes
  // back. Changing the kind of thing also asks the questions that depend on it.
  let onOverview = false;
  let followUps: Step[] = [];
  const snapshot = () => JSON.stringify({ ...draft, pictures: draft.pictures.map(p => p.id), voice: !!draft.voice, thumb: undefined, place }) + String(draft.voice?.size ?? '');
  let original = '';
  const changed = () => snapshot() !== original;

  const current = (): Step => steps()[stepIdx];
  const go = (i: number) => {
    onOverview = false;
    const list = steps();
    stepIdx = Math.max(0, Math.min(list.length - 1, i));
    dots.replaceChildren(...list.map((_, j) => h('span', { class: j <= stepIdx ? 'on' : '' })));
    // The hunt guesses read the answers; going back to change one re-guesses.
    if (list[stepIdx] !== 'tell') huntPicks = null;
    body.replaceChildren();
    body.scrollTop = 0;
    render[list[stepIdx]]();
  };
  const put = (...xs: (Node | null | false)[]) => body.append(...xs.filter((x): x is Node => !!x));
  const goStep = (st: Step) => go(Math.max(0, steps().indexOf(st)));
  const next = () => {
    sounds.tap();
    if (!editing) return go(stepIdx + 1);
    const after = followUps.shift();
    if (after) goStep(after);
    else overview();
  };
  const prevBtn = () => editing
    ? h('button', { class: 'text-btn', onclick: () => { followUps = []; overview(); } }, '⬅️ Back to my find')
    : stepIdx > 0 ? h('button', { class: 'text-btn', onclick: () => go(stepIdx - 1) }, '⬅️ Go back') : null;
  /** In editing, the step's own "Next" reads as "Done". */
  const nextLabel = (label = 'Next ➡️') => (editing ? '✅ Done' : label);
  const title = (text?: string, pose?: Expression) => {
    const line = stepLine(guide, current());
    return buddySays(guide, { text: text ?? line.text, pose: pose ?? line.pose });
  };

  const render: Record<Step, () => void> = {
    picture() {
      const file = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true }) as HTMLInputElement;
      const addPicture = (p: Picture) => {
        if (draft.pictures.length >= MAX_PICTURES) return toast(`That's ${MAX_PICTURES} pictures, the most one find can hold.`);
        draft.pictures.push(p);
        sounds.pick();
      };
      file.addEventListener('change', async () => {
        const f = file.files?.[0];
        file.value = '';
        if (!f) return;
        try {
          addPicture({ id: uid(), kind: 'photo', blob: await downscale(f, 1600) });
          say('Great picture!');
          paint();
        } catch {
          toast('Hmm, that picture did not work. Try again?');
        }
      });
      const gallery = h('div', { class: 'pic-gallery' });
      const paint = () => {
        gallery.replaceChildren(...draft.pictures.map((p, i) => {
          const img = h('img', { alt: p.kind === 'photo' ? `Photo ${i + 1}` : `Drawing ${i + 1}` });
          const cell = h('div', { class: 'pic-cell' }, img,
            h('span', { class: 'pic-kind' }, p.kind === 'photo' ? '📷' : '🎨'),
            h('button', { class: 'pic-del', 'aria-label': 'Remove this picture', onclick: () => { draft.pictures.splice(i, 1); paint(); } }, '✖'));
          gallery.append(cell);
          img.src = blobUrl(p.blob, cell);
          return cell;
        }));
        nextBtn.textContent = editing ? '✅ Done' : draft.pictures.length ? 'Next ➡️' : '👀 No pictures, next';
        count.textContent = draft.pictures.length ? `${draft.pictures.length} ${draft.pictures.length === 1 ? 'picture' : 'pictures'}` : '';
      };
      const count = h('p', { class: 'hint center' });
      const nextBtn = h('button', { class: 'big-btn', onclick: next });
      const showPad = () => {
        pad = drawPad();
        body.replaceChildren(
          title('Draw what you see!', 'point'),
          pad.el,
          h('div', { class: 'ask-row' },
            h('button', { class: 'big-btn', onclick: async () => {
              const b = await pad!.getBlob();
              if (!b) { say('Draw something first!'); return; }
              addPicture({ id: uid(), kind: 'drawing', blob: b });
              go(stepIdx);
            } }, '✅ Done drawing'),
            h('button', { class: 'big-btn soft', onclick: () => go(stepIdx) }, '⬅️ Back'),
          ),
        );
      };
      put(
        title(),
        gallery, count,
        h('div', { class: 'choice-grid two' },
          h('button', { class: 'choice', onclick: () => file.click() }, h('span', { class: 'choice-emoji' }, '📷'), 'Add a photo'),
          h('button', { class: 'choice', onclick: showPad }, h('span', { class: 'choice-emoji' }, '🎨'), 'Add a drawing'),
        ),
        nextBtn, file,
      );
      paint();
    },

    category() {
      put(
        title(),
        h('div', { class: 'choice-grid' }, ...CATEGORIES.map(c =>
          h('button', {
            class: `choice ${draft.category === c.id ? 'on' : ''}`, style: `--cat:${c.colour}`,
            onclick: () => {
              const changedKind = draft.category !== c.id;
              if (changedKind) { draft.species = undefined; draft.sign = undefined; }
              draft.category = c.id as CategoryId;
              if (editing && changedKind) {
                followUps = [];
                if (c.id === 'sign') followUps.push('sign');
                if (hasSpeciesStep(c.id as CategoryId)) followUps.push('species');
              }
              sounds.pick();
              say(c.cheer);
              setTimeout(next, 700);
            },
          }, h('span', { class: 'choice-emoji' }, c.emoji), c.label),
        )),
        prevBtn(),
      );
    },

    sign() {
      put(
        title(),
        h('div', { class: 'choice-grid' }, ...SIGNS.map(s =>
          h('button', {
            class: `choice ${draft.sign === s.id ? 'on' : ''}`,
            onclick: () => { draft.sign = s.id; sounds.pick(); say(s.label); setTimeout(next, 500); },
          }, h('span', { class: 'choice-emoji' }, s.emoji), s.label),
        )),
        h('p', { class: 'safety-note' }, '🐻 Ranger Bramble says: look at tracks and scat, but never touch scat. Wash your hands after exploring!'),
        h('button', { class: 'text-btn', onclick: next }, 'Skip ⏭️'),
        prevBtn(),
      );
    },

    species() {
      const cat = draft.category!;
      const chosen = h('div', { class: 'species-chosen' });
      const paintChosen = () => {
        chosen.replaceChildren();
        if (draft.species) {
          chosen.append(h('div', { class: 'win-card' }, h('span', { class: 'win-emoji' }, '📚'),
            h('div', {}, h('strong', {}, draft.species.name), draft.species.scientific ? h('p', { class: 'latin' }, draft.species.scientific) : null),
            h('button', { class: 'round-btn small', 'aria-label': 'Not this one', onclick: () => { draft.species = undefined; paintChosen(); } }, '✖')));
        }
      };
      const choose = (sp: Species) => {
        draft.species = { name: sp.n, ...(sp.s ? { scientific: sp.s } : {}), taxon: sp.t, ...(sp.c ? { code: sp.c } : {}) } satisfies SpeciesPick;
        sounds.pick();
        say(`${sp.n}!`);
        paintChosen();
      };
      const search = h('input', { class: 'text-in', type: 'search', placeholder: 'Type a name to search', 'aria-label': 'Search for a species', autocomplete: 'off' }) as HTMLInputElement;
      const results = h('div', { class: 'species-results' });
      const familiar = h('div', { class: 'hunt-chips' });
      const status = h('p', { class: 'hint' }, 'Loading the species list…');
      let list: Species[] = [];
      const paintResults = () => {
        const q = search.value.trim();
        results.replaceChildren();
        if (!q) return;
        const found = searchSpecies(list, cat, q, 30);
        if (!found.length) { results.append(h('p', { class: 'hint' }, 'Nothing with that name. Try another word!')); return; }
        for (const sp of found) {
          results.append(h('button', { class: 'species-row', onclick: () => choose(sp) },
            h('strong', {}, sp.n), sp.s ? h('span', { class: 'latin' }, sp.s) : null, h('span', { class: 'species-taxon' }, sp.t)));
        }
      };
      search.addEventListener('input', paintResults);
      void loadSpecies().then(({ list: l, source }) => {
        list = l;
        status.textContent = l.length ? `${l.length.toLocaleString()} species to choose from${source ? ` · ${source}` : ''}.` : 'No species list on this device yet.';
        const names = new Map(l.map(sp => [sp.n, sp] as const));
        const known = (FAMILIAR[cat] ?? []).map(n => names.get(n)).filter((sp): sp is Species => !!sp);
        // Species with a drawing come first, as big picture buttons; the rest stay word chips.
        const drawn = known.filter(sp => artFor(sp.n));
        familiar.replaceChildren(
          ...drawn.map(sp => {
            const art = artFor(sp.n)!;
            const fig = h('span', { class: 'art-fig', 'aria-hidden': 'true' });
            fig.innerHTML = art.svg();
            return h('button', { class: 'art-chip', onclick: () => { choose(sp); say(art.tell); } }, fig, h('strong', {}, art.label));
          }),
          ...known.filter(sp => !artFor(sp.n)).map(sp => h('button', { class: 'hunt-chip', onclick: () => choose(sp) }, sp.n)),
        );
        paintResults();
      });
      put(
        title(),
        chosen,
        h('div', { class: 'species-box' }, familiar, search, results, status),
        h('button', { class: 'big-btn', onclick: next }, nextLabel()),
        h('button', { class: 'text-btn', onclick: () => { draft.species = undefined; next(); } }, "🤷 I don't know yet"),
        prevBtn(),
      );
      paintChosen();
    },

    colours() {
      const grid = h('div', { class: 'colour-grid' });
      for (const col of COLOURS) {
        const on0 = draft.colours.includes(col.id);
        const b = h('button', { class: `colour ${on0 ? 'on' : ''}`, style: `--sw:${col.hex}`, 'aria-label': col.label, 'aria-pressed': String(on0) }, h('span', {}, col.label));
        b.addEventListener('click', () => {
          const i = draft.colours.indexOf(col.id);
          if (i >= 0) draft.colours.splice(i, 1);
          else { draft.colours.push(col.id); say(col.label); }
          b.classList.toggle('on', i < 0);
          b.setAttribute('aria-pressed', String(i < 0));
          sounds.tap();
        });
        grid.append(b);
      }
      put(title(), grid, h('button', { class: 'big-btn', onclick: next }, nextLabel()), prevBtn());
    },

    size() {
      put(
        title(),
        h('div', { class: 'choice-list' }, ...SIZES.map(s =>
          h('button', {
            class: `choice wide ${draft.size === s.id ? 'on' : ''}`,
            onclick: () => { draft.size = s.id; sounds.pick(); say(s.label); setTimeout(next, 500); },
          }, h('span', { class: 'choice-emoji' }, s.emoji), s.label),
        )),
        h('button', { class: 'text-btn', onclick: next }, 'Skip ⏭️'),
        prevBtn(),
      );
    },

    count() {
      put(
        title(),
        h('div', { class: 'choice-grid three' }, ...COUNTS.map(c =>
          h('button', {
            class: `choice ${draft.count === c.id ? 'on' : ''}`,
            onclick: () => { draft.count = c.id; sounds.pick(); say(c.label); setTimeout(next, 500); },
          }, h('span', { class: 'choice-emoji' }, c.emoji), c.label),
        )),
        h('button', { class: 'text-btn', onclick: next }, 'Skip ⏭️'),
        prevBtn(),
      );
    },

    where() {
      const cards = h('div', { class: 'choice-list' });
      const note = h('p', { class: 'hint center' });
      const paint = () => {
        const opt = (kind: Place['kind'], emoji: string, label: string, sub: string, onclick: () => void, extraClass = '') =>
          h('button', { class: `choice wide ${place.kind === kind ? 'on' : ''} ${extraClass}`, onclick }, h('span', { class: 'choice-emoji' }, emoji),
            h('span', { class: 'where-text' }, h('strong', {}, label), h('span', {}, sub)));
        const acc = fix ? accuracyWords(fix.accuracy) : null;
        cards.replaceChildren(
          ...(editing && typeof existing!.lat === 'number' ? [opt('keep', '📌', 'Keep it where it is', 'Where you put it before', () => { place = { kind: 'keep' }; sounds.pick(); paint(); })] : []),
          opt('gps', '📍', editing ? 'Where I am now' : 'Where I was standing', acc ? acc.text : 'Looking for where you are…', () => {
            if (!fix) { say('I am still looking for where you are.'); return; }
            place = { kind: 'gps' }; sounds.pick(); say(acc!.text); paint();
          }, acc ? `acc-${acc.level}` : 'acc-none'),
          opt('map', '🗺️', 'Tap the map', place.kind === 'map' ? 'Spot chosen! Tap to move it' : 'Put it exactly where it was', async () => {
            const start = place.kind === 'map' ? place : (typeof existing?.lat === 'number' ? { lat: existing.lat, lon: existing.lon! } : fix ? { lat: fix.lat, lon: fix.lon } : undefined);
            const got = await host.pickOnMap(start);
            if (got) { place = { kind: 'map', ...got }; say('Got it!'); }
            paint();
          }),
          opt('none', '🚫', "Don't put it on the map", 'It still goes in your sticker book', () => { place = { kind: 'none' }; sounds.pick(); paint(); }),
        );
        if (acc && acc.level === 'fuzzy' && place.kind === 'gps') {
          note.replaceChildren('The phone is not sure exactly where you are. ', h('button', { class: 'text-btn inline', onclick: () => void waitBetter() }, '⏳ Wait for a better spot'), ' or tap the map instead.');
        } else note.replaceChildren();
      };
      const waitBetter = async () => {
        note.textContent = '⏳ Hold still… finding a better spot';
        const better = await bestFix(15000, 10);
        if (better && (!fix || better.accuracy < fix.accuracy)) fix = better;
        if (fix) place = { kind: 'gps' };
        paint();
      };
      // Editing with GPS chosen means "where I am now": ask for a fresh fix.
      if (editing) fix = lastFix();
      put(title(), cards, note, h('button', { class: 'big-btn', onclick: next }, nextLabel()), prevBtn());
      paint();
      if (!fix && !editing) void bestFix(8000, 30).then(f => { if (f) { fix = f; if (place.kind === 'none') place = { kind: 'gps' }; paint(); } });
    },

    tell() {
      const cat = categoryOf(draft.category!);
      const parts: (Node | null)[] = [title()];
      parts.push(voiceControl(draft.voice, b => { draft.voice = b ?? undefined; }));
      const hunt = editing ? null : host.hunt();
      if (hunt && hunt.open.length) {
        const probe = toBadgeFind({ id: '', createdAt: '', ...draft, category: draft.category! } as Find);
        huntPicks ??= new Set(hunt.open.filter(i => meetsRule(i, probe)).map(i => i.id));
        const chips = h('div', { class: 'hunt-chips' }, ...hunt.open.map(i => {
          const b = h('button', { class: `hunt-chip ${huntPicks!.has(i.id) ? 'on' : ''}`, 'aria-pressed': String(huntPicks!.has(i.id)) },
            h('span', { class: 'hunt-chip-emoji' }, i.emoji), i.text);
          b.addEventListener('click', () => {
            const on = !huntPicks!.has(i.id);
            if (on) { huntPicks!.add(i.id); say(`${i.text}. Yes!`); sounds.pick(); } else huntPicks!.delete(i.id);
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', String(on));
          });
          return b;
        }));
        parts.push(h('div', { class: 'talk-card hunt-card' }, h('h3', {}, `${hunt.emoji} Does it count for your ${hunt.title}?`), chips));
      }
      const name = h('input', { class: 'text-in', placeholder: 'e.g. Sammy the Snail', maxlength: 40, value: draft.nickname ?? '' }) as HTMLInputElement;
      name.addEventListener('input', () => { draft.nickname = name.value.trim() || undefined; });
      parts.push(h('label', { class: 'field' }, h('span', {}, '🏷️ Give it a name (if you like)'), name));
      if (together) {
        const note = h('textarea', { class: 'text-in', rows: 3, placeholder: 'What did you notice together?', maxlength: 600 }) as HTMLTextAreaElement;
        note.value = draft.note ?? '';
        note.addEventListener('input', () => { draft.note = note.value.trim() || undefined; });
        parts.push(
          h('div', { class: 'talk-card' }, h('h3', {}, '💬 Talk about it'), h('ul', {}, ...cat.talk.map(t => h('li', {}, t)))),
          h('label', { class: 'field' }, h('span', {}, '✏️ Grown-up note'), note),
        );
      }
      parts.push(editing
        ? h('button', { class: 'big-btn', onclick: next }, '✅ Done')
        : h('button', { class: 'big-btn save-btn', onclick: () => void finish() }, 'Save my find! ✨'), prevBtn());
      put(...parts);
    },
  };

  let saving = false;
  async function finish() {
    if (saving) return;
    saving = true;
    const first = draft.pictures[0];
    const sameFirst = existing && existing.pictures[0]?.id === first?.id;
    const thumb = !first ? undefined : sameFirst && existing?.thumb ? existing.thumb : await downscale(first.blob, 240, 0.8).catch(() => undefined);
    const where: Pick<Find, 'lat' | 'lon' | 'accuracy' | 'placeBy'> =
      place.kind === 'keep' ? { lat: existing!.lat, lon: existing!.lon, accuracy: existing!.accuracy, placeBy: existing!.placeBy }
      : place.kind === 'map' ? { lat: place.lat, lon: place.lon, placeBy: 'map' }
      : place.kind === 'gps' && fix ? { lat: fix.lat, lon: fix.lon, accuracy: Math.round(fix.accuracy), placeBy: 'gps' }
      : {};
    const find: Find = {
      id: existing?.id ?? uid(),
      profileId: existing?.profileId ?? host.profile.id,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      ...(editing ? { editedAt: new Date().toISOString() } : {}),
      category: draft.category!,
      ...(draft.category === 'sign' && draft.sign ? { sign: draft.sign } : {}),
      ...(draft.species ? { species: draft.species } : {}),
      colours: draft.colours,
      size: draft.size,
      count: draft.count,
      nickname: draft.nickname,
      note: draft.note,
      pictures: draft.pictures,
      thumb,
      voice: draft.voice,
      favourite: existing?.favourite,
      ...where,
    };
    try {
      if (editing) {
        await host.update(find);
        sheet.remove();
        sounds.save();
        say('Saved!');
        toast('✅ Find changed');
      } else {
        await host.save(find, [...(huntPicks ?? [])]);
        sheet.remove();
      }
    } catch {
      saving = false;
      sounds.oops();
      toast('Oh no, it did not save. Ask a grown-up to check there is space on this device.', 5000);
    }
  }

  /** The summary a saved find opens on: every answer, each one tap from being changed. */
  function overview() {
    onOverview = true;
    body.replaceChildren();
    body.scrollTop = 0;
    const cat = draft.category ? categoryOf(draft.category) : null;
    const row = (st: Step, emoji: string, label: string, value: Node | string) =>
      h('button', { class: 'edit-row', onclick: () => { sounds.tap(); followUps = []; goStep(st); } },
        h('span', { class: 'edit-emoji' }, emoji),
        h('span', { class: 'edit-text' }, h('strong', {}, label), typeof value === 'string' ? h('span', {}, value) : value),
        h('span', { class: 'edit-pen', 'aria-hidden': 'true' }, '✏️'));
    const thumbs = h('span', { class: 'edit-thumbs' });
    for (const p of draft.pictures.slice(0, 4)) {
      const img = h('img', { alt: '' });
      thumbs.append(img);
      img.src = blobUrl(p.blob, img);
    }
    if (!draft.pictures.length) thumbs.textContent = 'No pictures yet';
    else if (draft.pictures.length > 4) thumbs.append(h('span', {}, `+${draft.pictures.length - 4}`));
    const colourDots = h('span', { class: 'colour-dots' }, ...draft.colours.map(c => {
      const col = COLOURS.find(x => x.id === c)!;
      return h('span', { class: 'dot', style: `--sw:${col.hex}`, title: col.label });
    }));
    if (!draft.colours.length) colourDots.textContent = 'None picked';
    const sign = SIGNS.find(x => x.id === draft.sign);
    const size = SIZES.find(x => x.id === draft.size);
    const cnt = COUNTS.find(x => x.id === draft.count);
    const where = place.kind === 'keep' ? 'On the map, where you put it'
      : place.kind === 'map' ? 'Moved to a spot you tapped'
      : place.kind === 'gps' ? 'Moved to where you are now'
      : 'Not on the map';
    const story = [draft.voice ? '🎤 Voice note' : '', draft.nickname ? `🏷️ ${draft.nickname}` : '', draft.note ? '✏️ Grown-up note' : ''].filter(Boolean).join(' · ') || 'Nothing yet';
    put(
      buddySays(guide, { text: 'Tap the part you want to change!', pose: 'point' }),
      h('div', { class: 'edit-list' },
        row('picture', '📷', 'Pictures', thumbs),
        row('category', cat?.emoji ?? '❓', 'What it is', cat?.label ?? '—'),
        draft.category === 'sign' ? row('sign', sign?.emoji ?? '🐾', 'The clue', sign?.label ?? 'Not picked') : null,
        draft.category && hasSpeciesStep(draft.category) ? row('species', '📚', 'Its name', draft.species?.name ?? 'Not named yet') : null,
        row('colours', '🎨', 'Colours', colourDots),
        row('size', size?.emoji ?? '📏', 'How big', size?.label ?? 'Not picked'),
        row('count', cnt?.emoji ?? '🔢', 'How many', cnt?.label ?? 'Not picked'),
        row('where', '📍', 'Where', where),
        row('tell', '💬', together ? 'Story, name and note' : 'Story and name', story),
      ),
      h('button', { class: 'big-btn save-btn', onclick: () => void finish() }, 'Save my changes ✅'),
      h('button', { class: 'text-btn', onclick: async () => {
        if (!changed() || (await askYesNo('Stop without saving the changes?', '↩️ Yes, stop', '✏️ Keep changing'))) close();
      } }, "↩️ Don't save"),
    );
  }

  if (editing) {
    original = snapshot();
    overview();
  } else go(0);
}
