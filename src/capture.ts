import { icon, labelled } from './icons.ts';
import type { ColourId, Find, FullFind, Picture, Profile, Settings, SpeciesPick } from './types.ts';
import { COLOURS, COUNTS, GROUPS, SIGNS, SIZES, categoryOf, fullName, groupOf, kindWords, kindsOf, type Category, type Group } from './categories.ts';
import { kindForSpecies, kindToOffer } from './speciesKind.ts';
import { kindIcon } from './kindIcon.ts';
import { askYesNo, blobUrl, h, openSheet, toast, uid } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { downscale } from './image.ts';
import { drawPad } from './drawPad.ts';
import { voiceNotes } from './voice.ts';
import { askGrownUp } from './gateView.ts';
import { tierOf } from './tiers.ts';
import { accuracyWords, bestFix, steadiedFix, steadyNow, type Fix } from './gps.ts';
import { buddySays } from './buddyView.ts';
import { stepLine } from './buddyLines.ts';
import type { Expression } from './buddies.ts';
import { meetsRule, type HuntItem } from './hunts.ts';
import { toBadgeFind } from './badges.ts';
import { hasSpeciesStep, searchSpecies, type Species } from './species.ts';
import { isRare, statusOf } from './rarity.ts';
import { habitatKindToOffer, habitatNamed, habitatsFor, hasPlaceStep, searchHabitats, type HabitatType } from './habitats.ts';
import { FAMILIAR } from './familiar.ts';
import { loadSpecies } from './speciesStore.ts';
import { artFor } from './sproutArt.ts';

export interface CaptureHost {
  settings: Settings;
  profile: Profile;
  /** The active scavenger hunt's open items, if a hunt is on. */
  hunt: () => { title: string; emoji: string; open: HuntItem[] } | null;
  save: (f: FullFind, huntItems: string[]) => Promise<void>;
  /** Saves a change to a find that already exists. */
  update: (f: FullFind) => Promise<void>;
  /** Lets the explorer put the find on the map by hand. */
  pickOnMap: (start?: { lat: number; lon: number }) => Promise<{ lat: number; lon: number } | null>;
}

type Step = 'picture' | 'category' | 'sign' | 'species' | 'place' | 'describe' | 'where' | 'tell';

export const MAX_PICTURES = 12;

/**
 * "I found something!" — one step per screen, big buttons, everything skippable
 * but the kind of thing, and kept short for a trail: once the kind is picked, ✨ Save now is on every step; colours,
 * size and count share one "Describe it" screen; the Where question is asked only when the GPS cannot answer it;
 * and the last screen is the save screen itself (voice notes, a name). A Sprout gets three screens: picture, group,
 * save (docs/AGE_TIERS.md). Passing `existing` edits a saved find instead: same id, same place and time, with every
 * answer pre-filled.
 */
/** `at`: a spot already chosen on the map (a press and hold there), so the find starts placed on it. */
export function startCapture(host: CaptureHost, existing?: FullFind, at?: { lat: number; lon: number }): void {
  const together = host.profile.mode === 'together';
  const guide = host.profile.guide;
  const editing = !!existing;
  // The place is taken when the explorer says "I found something", not after they finish drawing.
  // Steadied over the last few seconds (gpsSteady.ts), and given up to four more to settle, as Field Mapper's
  // GPS point is.
  let fix: Fix | null = editing ? null : steadyNow();
  if (!editing && fix?.unsettled) {
    const started = fix;
    void steadiedFix().then(f => { if (f && fix === started) fix = f; });
  }
  /** Where the find goes: GPS, a tapped spot, kept as it was (editing), or nowhere. */
  type Place = { kind: 'gps' } | { kind: 'map'; lat: number; lon: number } | { kind: 'keep' } | { kind: 'none' };
  let place: Place = editing ? (typeof existing!.lat === 'number' ? { kind: 'keep' } : { kind: 'none' })
    : at ? { kind: 'map', ...at }
    : (fix ? { kind: 'gps' } : { kind: 'none' });
  const draft: Partial<FullFind> & { colours: ColourId[]; pictures: Picture[]; voices: Blob[] } = existing
    ? { ...existing, colours: [...existing.colours], pictures: [...existing.pictures], voices: [...existing.voices] }
    : { colours: [], pictures: [], voices: [] };
  // Asked only when the GPS cannot answer it: no fix yet, or a fuzzy one. A spot pressed on the map is an answer.
  // Decided once, so the steps do not shift under the explorer when a fix arrives later; the save screen can still
  // change the place.
  const askWhere = editing || (!at && !(fix && accuracyWords(fix.accuracy).level !== 'fuzzy'));
  const sprout = !editing && tierOf(host.profile.tier).id === 'sprout';
  let stepIdx = 0;
  let pad: ReturnType<typeof drawPad> | null = null;
  let huntPicks: Set<string> | null = null;

  const steps = (): Step[] => {
    const s: Step[] = ['picture', 'category'];
    if (sprout) return [...s, 'tell'];
    if (draft.category === 'sign') s.push('sign');
    // A habitat is a place, not a species: it asks "What kind of place?" (habitats.ts) instead.
    if (draft.category && hasPlaceStep(draft.category)) s.push('place');
    else if (draft.category && hasSpeciesStep(draft.category)) s.push('species');
    s.push('describe');
    if (askWhere) s.push('where');
    s.push('tell');
    return s;
  };

  const { body, close, sheet } = openSheet({ title: editing ? 'Change my find' : 'I found something!', emoji: editing ? '✏️' : '✨', className: 'capture' });
  const back = sheet.querySelector('.close-btn') as HTMLButtonElement;
  back.replaceWith(back.cloneNode(true));
  (sheet.querySelector('.close-btn') as HTMLButtonElement).addEventListener('click', async () => {
    if (editing) {
      // ✖ always leaves; going back to the summary from one question is that step's own "⬅️ Back to my find".
      if (!changed() || (await askYesNo('Stop without saving the changes?', '↩️ Yes, stop', '✏️ Keep changing'))) close();
      return;
    }
    if (stepIdx === 0 && !draft.pictures.length) return close();
    if (await askYesNo('Stop and throw this find away?', '🗑️ Yes', '✨ Keep going')) close();
  });
  // A new find's header is just ✖ and the progress (the guide's bubble says what each step wants).
  if (!editing) sheet.classList.add('slim-head');
  const dots = h('div', { class: 'step-dots', 'aria-hidden': 'true', hidden: editing });
  // Back and forward live at the top, either side of the progress, so they are always in the same place and never
  // scrolled away (paintNav decides what each does on the step on screen).
  const prevNav = h('button', { class: 'round-btn step-nav', 'aria-label': 'Go back a step' }, icon('back')) as HTMLButtonElement;
  const nextNav = h('button', { class: 'round-btn step-nav', 'aria-label': 'Next step', hidden: editing }, icon('forward')) as HTMLButtonElement;
  prevNav.addEventListener('click', () => { sounds.tap(); navBack?.(); });
  nextNav.addEventListener('click', () => { navForward?.(); });
  const head = sheet.querySelector('.sheet-head')!;
  if (editing) head.querySelector('.close-btn')!.after(prevNav);
  else head.append(prevNav, dots, nextNav);
  let navBack: (() => void) | null = null;
  let navForward: (() => void) | null = null;
  /** The drawing pad is open over the picture step: back closes it, forward waits for Done drawing. */
  let padOpen = false;
  /** A group's kinds are on screen (the category step's second level): ⬅️ goes back to the groups. */
  let catBack: (() => void) | null = null;

  // Editing opens on a summary of the find; each row opens ONE question and comes
  // back. Changing the kind of thing also asks the questions that depend on it.
  let followUps: Step[] = [];
  const snapshot = () => JSON.stringify({ ...draft, pictures: draft.pictures.map(p => p.id), voices: draft.voices.map(v => v.size), thumb: undefined, place });
  let original = '';
  const changed = () => snapshot() !== original;

  /** The step on screen: usually steps()[stepIdx], but the save screen's "Change" opens Where as a detour. */
  let showing: Step = 'picture';
  let detour = false;
  /** Whatever the screen holds that is not yet in the draft (the typed species name), written before leaving it. */
  let commit: (() => void) | null = null;
  const leave = () => { commit?.(); commit = null; };
  const current = (): Step => showing;
  /**
   * What ⬅️ and ➡️ do on the screen showing now. Forward is offered once the step can be left: not before the kind
   * of thing is picked (every later step depends on it), and not on the save screen, whose Save is the way on.
   */
  const paintNav = () => {
    const set = (btn: HTMLButtonElement, act: (() => void) | null) => { btn.disabled = !act; btn.hidden = editing && btn === nextNav ? true : btn.hidden; };
    if (editing) {
      navBack = onOverview ? null : () => { followUps = []; overview(); };
      prevNav.hidden = onOverview;
    } else if (padOpen || detour) {
      navBack = () => go(stepIdx);
      navForward = null;
    } else {
      const list = steps();
      const st = list[stepIdx];
      navBack = st === 'category' && catBack ? catBack : stepIdx > 0 ? () => go(stepIdx - 1) : null;
      navForward = stepIdx < list.length - 1 && !(st === 'category' && !draft.category) ? next : null;
    }
    set(prevNav, navBack);
    set(nextNav, navForward);
  };
  /** The editing summary is on screen (it has no step to go back from). */
  let onOverview = false;
  const go = (i: number) => {
    leave();
    detour = false;
    padOpen = false;
    catBack = null;
    onOverview = false;
    const list = steps();
    stepIdx = Math.max(0, Math.min(list.length - 1, i));
    showing = list[stepIdx];
    dots.replaceChildren(...list.map((_, j) => h('span', { class: j <= stepIdx ? 'on' : '' })));
    // The hunt guesses read the answers; going back to change one re-guesses.
    if (list[stepIdx] !== 'tell') huntPicks = null;
    body.replaceChildren();
    body.scrollTop = 0;
    render[list[stepIdx]]();
    paintNav();
  };
  const put = (...xs: (Node | null | false)[]) => body.append(...xs.filter((x): x is Node => !!x));
  const goStep = (st: Step) => go(Math.max(0, steps().indexOf(st)));
  const next = () => {
    sounds.tap();
    if (detour) return go(stepIdx);
    if (!editing) return go(stepIdx + 1);
    const after = followUps.shift();
    if (after) goStep(after);
    else overview();
  };
  /** In editing, the step's own "Next" reads as "Done". */
  const nextLabel = (): Node | string => (editing || detour ? '✅ Done' : labelled('Next', 'forward'));
  /** A picture or voice note already saved with the find being changed (not one added just now). */
  const savedPicture = (id: string) => !!existing?.pictures.some(p => p.id === id);
  const savedVoice = (note: Blob) => !!existing?.voices.includes(note);
  /**
   * Removing something from a find. Once it is saved, removing it is deleting it: in "On my own" mode that asks a
   * grown-up, as every other delete does (a child could otherwise empty a find of its photos through Change it).
   * A voice note just recorded is still asked about, as it is easily tapped away by accident; a picture just
   * taken goes at once.
   */
  const mayRemove = async (what: string, saved: boolean, alwaysAsk = false): Promise<boolean> => {
    if (saved && host.profile.mode === 'explorer') return askGrownUp(`Removing a saved ${what} cannot be undone.`);
    if (saved || alwaysAsk) return askYesNo(`Remove this ${what}?`, '🗑️ Remove', 'Keep it');
    return true;
  };
  /**
   * The name box of the species and place steps, with 🤷 Not sure beside it: one tap clears the answer and goes on,
   * for an explorer who does not know (it is never a wrong answer).
   */
  const typeRow = (input: HTMLInputElement, clear: () => void) => h('div', { class: 'type-row' }, input,
    h('button', { class: 'big-btn soft not-sure', onclick: () => { clear(); commit = null; say('Not sure. That is okay!'); next(); } }, '🤷 Not sure'));
  /** ✨ Save now: on every new find's step after the kind, so the rest is optional on a trail. */
  const saveNow = () => (editing || detour || !draft.category ? null
    : h('button', { class: 'big-btn soft save-now', onclick: () => void finish() }, '✨ Save now'));
  /** Opens the Where question from the save screen, and comes back to it. */
  const changePlace = () => {
    leave();
    detour = true;
    showing = 'where';
    body.replaceChildren();
    body.scrollTop = 0;
    render.where();
    paintNav();
  };
  const title = (text?: string, pose?: Expression) => {
    const line = stepLine(guide, current());
    return buddySays(guide, { text: text ?? line.text, pose: pose ?? line.pose });
  };

  const render: Record<Step, () => void> = {
    picture() {
      // Two inputs, as on the profile card: with `capture` a phone opens the camera straight away and offers no
      // library; without it, the phone's own chooser opens on the photo library — several at once (`multiple`),
      // as Field Mapper's batch photo import picks them. A library photo's own location is NOT read: a find goes
      // where the explorer chooses (Where step), and re-encoding drops the photo's hidden details anyway.
      const file = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true }) as HTMLInputElement;
      const library = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true }) as HTMLInputElement;
      const addPicture = (p: Picture) => {
        if (draft.pictures.length >= MAX_PICTURES) return toast(`That's ${MAX_PICTURES} pictures, the most one find can hold.`);
        draft.pictures.push(p);
        sounds.pick();
      };
      const takePictures = async (input: HTMLInputElement) => {
        const files = [...(input.files ?? [])];
        input.value = '';
        if (!files.length) return;
        const room = MAX_PICTURES - draft.pictures.length;
        if (room <= 0) return toast(`That's ${MAX_PICTURES} pictures, the most one find can hold.`);
        let added = 0, failed = 0;
        count.textContent = '⏳ Adding pictures…';
        for (const f of files.slice(0, room)) {
          try {
            addPicture({ id: uid(), kind: 'photo', blob: await downscale(f, 1600) });
            added++;
          } catch { failed++; }
        }
        if (files.length > room) toast(`Only ${room} more ${room === 1 ? 'picture fits' : 'pictures fit'}: one find holds ${MAX_PICTURES}.`);
        else if (failed) toast(added ? `${failed} ${failed === 1 ? 'picture' : 'pictures'} did not work.` : 'Hmm, that picture did not work. Try again?');
        if (added) say(added === 1 ? 'Great picture!' : 'Great pictures!');
        paint();
      };
      file.addEventListener('change', () => void takePictures(file));
      library.addEventListener('change', () => void takePictures(library));
      const gallery = h('div', { class: 'pic-gallery' });
      const paint = () => {
        gallery.replaceChildren(...draft.pictures.map((p, i) => {
          const img = h('img', { alt: p.kind === 'photo' ? `Photo ${i + 1}` : `Drawing ${i + 1}` });
          const cell = h('div', { class: 'pic-cell' }, img,
            h('span', { class: 'pic-kind' }, p.kind === 'photo' ? '📷' : '🎨'),
            h('button', { class: 'pic-del', 'aria-label': 'Remove this picture', onclick: async () => {
              if (!(await mayRemove(p.kind === 'photo' ? 'photo' : 'drawing', savedPicture(p.id)))) return;
              const at = draft.pictures.indexOf(p);
              if (at >= 0) draft.pictures.splice(at, 1);
              paint();
            } }, icon('close')));
          gallery.append(cell);
          img.src = blobUrl(p.blob, cell);
          return cell;
        }));
        nextBtn.replaceChildren(editing ? '✅ Done' : draft.pictures.length ? labelled('Next', 'forward') : '👀 No pictures, next');
        count.textContent = draft.pictures.length ? `${draft.pictures.length} ${draft.pictures.length === 1 ? 'picture' : 'pictures'}` : '';
      };
      const count = h('p', { class: 'hint center' });
      const nextBtn = h('button', { class: 'big-btn', onclick: next });
      const showPad = () => {
        pad = drawPad();
        padOpen = true;
        paintNav();
        body.replaceChildren(
          title('Draw what you see!', 'point'),
          pad.el,
          h('button', { class: 'big-btn', onclick: async () => {
            const b = await pad!.getBlob();
            if (!b) { say('Draw something first!'); return; }
            addPicture({ id: uid(), kind: 'drawing', blob: b });
            go(stepIdx);
          } }, '✅ Done drawing'),
        );
      };
      put(
        title(),
        gallery, count,
        h('div', { class: 'choice-grid three' },
          h('button', { class: 'choice', onclick: () => file.click() }, h('span', { class: 'choice-emoji' }, '📷'), 'Take a photo'),
          h('button', { class: 'choice', onclick: () => library.click() }, h('span', { class: 'choice-emoji' }, '🖼️'), 'My photos'),
          h('button', { class: 'choice', onclick: showPad }, h('span', { class: 'choice-emoji' }, '🎨'), 'Draw it'),
        ),
        nextBtn, file, library,
      );
      paint();
    },

    category() {
      // Two levels: the five groups (and "Other"), then the kinds in the one tapped. A Sprout stops at the group. There is
      // no "Not sure" kind to pick any more: "Other" covers it (a find saved as a mystery before 2.10 stays one).
      // Coming back to this step opens the group of the kind already picked, with it lit.
      const pickKind = (c: Category) => {
        const changedKind = draft.category !== c.id;
        if (changedKind) { draft.species = undefined; draft.sign = undefined; draft.habitat = undefined; }
        draft.category = c.id;
        if (editing && changedKind) {
          followUps = [];
          if (c.id === 'sign') followUps.push('sign');
          if (hasPlaceStep(c.id)) followUps.push('place');
          else if (hasSpeciesStep(c.id)) followUps.push('species');
        }
        sounds.pick();
        say(c.cheer);
        setTimeout(next, 700);
      };
      const choice = (k: { id: string; emoji: string; art?: string; colour: string }, words: string, on: boolean, onclick: () => void, hint?: string) =>
        h('button', { class: `choice ${on ? 'on' : ''}`, style: `--cat:${k.colour}`, 'aria-pressed': String(on), onclick },
          kindIcon(k, 'choice-emoji'), h('span', {}, words), hint ? h('span', { class: 'choice-hint' }, hint) : null);
      const showGroups = () => {
        catBack = null;
        body.replaceChildren();
        const picked = draft.category ? groupOf(draft.category)?.id : undefined;
        const other = categoryOf('other');
        put(
          title(),
          h('div', { class: 'choice-grid' },
            ...GROUPS.map(g => choice(g, g.label, picked === g.id, () => {
              if (sprout) return pickKind(categoryOf(g.generic));
              sounds.tap();
              showKinds(g);
            })),
            choice(other, other.label, draft.category === 'other' || draft.category === 'mystery', () => pickKind(other), 'Something else or not sure'),
          ),
        );
        paintNav();
      };
      const showKinds = (g: Group) => {
        catBack = showGroups;
        body.replaceChildren();
        body.scrollTop = 0;
        say(g.ask);
        put(
          title(g.ask, 'think'),
          h('div', { class: 'choice-grid kinds' }, ...kindsOf(g).map(c =>
            choice(c, c.pick ?? c.label, draft.category === c.id, () => pickKind(c), c.hint))),
          h('button', { class: 'text-btn', onclick: () => { sounds.tap(); showGroups(); } },
            labelled(`Not ${/^[aeiou]/i.test(g.label) ? 'an' : 'a'} ${g.label.toLowerCase()}?`, 'back', 'before')),
        );
        paintNav();
      };
      const open = !sprout && draft.category ? groupOf(draft.category) : undefined;
      if (open) showKinds(open);
      else showGroups();
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
        saveNow(),
      );
    },

    species() {
      // The explorer's own words come first: a box to type in, front and centre — "little plant" is a fine answer
      // for now (saved as their own name, `own`, never counted as a named species). Suggestions sit below it.
      const cat = draft.category!;
      const chosen = h('div', { class: 'species-chosen' });
      const search = h('input', {
        class: 'text-in species-type', type: 'search', placeholder: 'Type its name…', 'aria-label': 'What is it called?',
        autocomplete: 'off', enterkeyhint: 'done', maxlength: 60,
      }) as HTMLInputElement;
      search.value = draft.species?.name ?? '';
      const paintChosen = () => {
        chosen.replaceChildren();
        if (draft.species && !draft.species.own) {
          chosen.append(h('div', { class: 'win-card' }, h('span', { class: 'win-emoji' }, '📚'),
            h('div', {}, h('strong', {}, draft.species.name), draft.species.scientific ? h('p', { class: 'latin' }, draft.species.scientific) : null,
              isRare(draft.species.status) ? h('p', { class: 'rare-hint' }, '🌟 A rare one!') : null),
            h('button', { class: 'round-btn small', 'aria-label': 'Not this one', onclick: () => { draft.species = undefined; search.value = ''; paintChosen(); paintResults(); } }, icon('close'))));
        }
      };
      const choose = async (sp: Species, andGo = false) => {
        // Its statuses ride along by value (rarity.ts): a rare one gets the big celebration when the find is saved.
        const status = statusOf(sp);
        draft.species = { name: sp.n, ...(sp.s ? { scientific: sp.s } : {}), taxon: sp.t, ...(sp.c ? { code: sp.c } : {}), ...(status ? { status } : {}) } satisfies SpeciesPick;
        search.value = sp.n;
        sounds.pick();
        say(`${sp.n}!`);
        paintChosen();
        paintResults();
        // Any species can be named from any kind (searchSpecies). One from another kind asks before the find changes
        // to match: "Turkey Tail is a kind of shelf mushroom. Make it Shelf mushroom?" No keeps both as they are.
        const offer = kindToOffer(draft.category!, sp);
        if (offer) {
          const was = categoryOf(draft.category!), now = categoryOf(offer);
          const yes = await askYesNo(`${sp.n} is a kind of ${fullName(now).toLowerCase()}. Make this find ${fullName(now)}?`,
            `✅ Yes, ${fullName(now)}`, `No, keep ${fullName(was)}`, was.id === 'sign' ? 'danger' : 'go');
          if (yes) {
            if (draft.category === 'sign') draft.sign = undefined;
            draft.category = offer;
            say(now.cheer);
            // The step list depends on the kind (a track has a clue step): stay on this step in the new list.
            if (!editing) {
              stepIdx = Math.max(0, steps().indexOf('species'));
              dots.replaceChildren(...steps().map((_, j) => h('span', { class: j <= stepIdx ? 'on' : '' })));
              paintNav();
            }
          }
        }
        if (andGo) setTimeout(next, 600);
      };
      // What the box says becomes the explorer's own name, unless it IS the species picked from the list.
      commit = () => {
        const typed = search.value.trim();
        if (draft.species && !draft.species.own && draft.species.name === typed) return;
        draft.species = typed ? { name: typed, own: true } : undefined;
      };
      const results = h('div', { class: 'species-results' });
      const familiar = h('div', { class: 'hunt-chips' });
      const status = h('p', { class: 'hint' }, 'Loading the species list…');
      let list: Species[] = [];
      const paintResults = () => {
        const q = search.value.trim();
        results.replaceChildren();
        familiar.hidden = !!q;
        if (!q || (draft.species && !draft.species.own && draft.species.name === q)) return;
        results.append(h('button', { class: 'species-row own-name', onclick: () => { commit?.(); sounds.pick(); say(`${q}!`); next(); } },
          h('strong', {}, `✏️ Call it “${q}”`), h('span', { class: 'species-taxon' }, 'my own name')));
        for (const sp of searchSpecies(list, draft.category!, q, 30)) {
          // What kind it is, so a species from outside this find's kind is plain to see before it is picked.
          const k = kindForSpecies(sp);
          results.append(h('button', { class: 'species-row', onclick: () => void choose(sp) },
            h('strong', {}, sp.n), sp.s ? h('span', { class: 'latin' }, sp.s) : null,
            h('span', { class: 'species-taxon' }, k ? `${categoryOf(k).emoji} ${sp.t}` : sp.t)));
        }
      };
      search.addEventListener('input', () => {
        if (draft.species && !draft.species.own && search.value.trim() !== draft.species.name) { draft.species = undefined; paintChosen(); }
        paintResults();
      });
      search.addEventListener('keydown', e => { if (e.key === 'Enter') { search.blur(); next(); } });
      void loadSpecies().then(({ list: l, source }) => {
        list = l;
        status.textContent = l.length ? `${l.length.toLocaleString()} species to choose from${source ? ` · ${source}` : ''}.` : 'No species list on this device yet.';
        const names = new Map(l.map(sp => [sp.n, sp] as const));
        const known = (FAMILIAR[cat] ?? []).map(n => names.get(n)).filter((sp): sp is Species => !!sp);
        // Species with a drawing come first, as big picture buttons; the rest stay word chips. A tap picks and moves on.
        const drawn = known.filter(sp => artFor(sp.n));
        familiar.replaceChildren(
          ...drawn.map(sp => {
            const art = artFor(sp.n)!;
            const fig = h('span', { class: 'art-fig', 'aria-hidden': 'true' });
            fig.innerHTML = art.svg();
            return h('button', { class: 'art-chip', onclick: () => { say(art.tell); void choose(sp, true); } }, fig, h('strong', {}, art.label));
          }),
          ...known.filter(sp => !artFor(sp.n)).map(sp => h('button', { class: 'hunt-chip', onclick: () => void choose(sp, true) }, sp.n)),
        );
        paintResults();
      });
      put(
        title(),
        typeRow(search, () => { search.value = ''; draft.species = undefined; }),
        chosen,
        h('div', { class: 'species-box' }, familiar, results, status),
        h('button', { class: 'big-btn', onclick: next }, nextLabel()),
        saveNow(),
      );
      paintChosen();
      paintResults();
    },

    place() {
      // A habitat find: "What kind of place?", asked the way a species is — the explorer's own words first, then the
      // places of Nova Scotia this kind holds as chips, and a search over every kind of place as they type.
      const cat = draft.category!;
      const search = h('input', {
        class: 'text-in species-type', type: 'search', placeholder: 'Type the place…', 'aria-label': 'What kind of place?',
        autocomplete: 'off', enterkeyhint: 'done', maxlength: 60,
      }) as HTMLInputElement;
      search.value = draft.habitat?.name ?? '';
      const suggestions = h('div', { class: 'place-grid' });
      const results = h('div', { class: 'species-results' });
      const choose = async (t: HabitatType) => {
        draft.habitat = { name: t.name };
        search.value = t.name;
        sounds.pick();
        say(`${t.name}!`);
        paint();
        // Like a species of another kind: "Bog is a kind of wetland. Make this find Wetland?" No keeps both.
        const offer = habitatKindToOffer(draft.category!, t);
        if (offer) {
          const was = categoryOf(draft.category!), now = categoryOf(offer);
          const yes = await askYesNo(`${t.name} is a kind of ${fullName(now).toLowerCase()}. Make this find ${fullName(now)}?`,
            `✅ Yes, ${fullName(now)}`, `No, keep ${fullName(was)}`, 'go');
          if (yes) {
            draft.category = offer;
            say(now.cheer);
            if (!editing) dots.replaceChildren(...steps().map((_, j) => h('span', { class: j <= stepIdx ? 'on' : '' })));
          }
        }
        setTimeout(next, 600);
      };
      // What the box says is the kind of place: a listed one when it names one (any capitals), else their own words.
      commit = () => {
        const typed = search.value.trim();
        const listed = habitatNamed(typed);
        draft.habitat = !typed ? undefined : listed ? { name: listed.name } : { name: typed, own: true };
      };
      const paint = () => {
        const q = search.value.trim();
        const listed = habitatNamed(q);
        // The place already picked (its name is in the box): the chips stay, with it lit.
        const picked = !!listed && draft.habitat?.name === listed.name && !draft.habitat.own;
        suggestions.hidden = !!q && !picked;
        suggestions.replaceChildren(...habitatsFor(draft.category!).map(t => {
          const on = draft.habitat?.name === t.name;
          return h('button', { class: `species-row place-pick ${on ? 'on' : ''}`, 'aria-pressed': String(on), onclick: () => void choose(t) },
            h('strong', {}, t.name), h('span', { class: 'species-taxon' }, t.hint));
        }));
        results.replaceChildren();
        if (!q || picked) return;
        // Typed words that name a listed place are that place (tapped below, so another kind is offered); others can
        // be kept as the explorer's own.
        if (!listed) {
          results.append(h('button', { class: 'species-row own-name', onclick: () => { commit?.(); sounds.pick(); say(`${q}!`); next(); } },
            h('strong', {}, `✏️ Call it “${q}”`), h('span', { class: 'species-taxon' }, 'my own words')));
        }
        for (const t of searchHabitats(q, draft.category!)) {
          results.append(h('button', { class: 'species-row', onclick: () => void choose(t) },
            h('strong', {}, t.name), h('span', { class: 'species-taxon' }, `${categoryOf(t.kind).emoji} ${t.hint}`)));
        }
      };
      search.addEventListener('input', paint);
      search.addEventListener('keydown', e => { if (e.key === 'Enter') { search.blur(); next(); } });
      const wet = cat === 'water' || cat === 'wetland' || cat === 'beach';
      put(
        title(),
        typeRow(search, () => { search.value = ''; draft.habitat = undefined; }),
        h('div', { class: 'species-box' }, suggestions, results),
        wet ? h('p', { class: 'safety-note' }, '🐻 Ranger Bramble says: stay with a grown-up near water, and keep back from the edge.') : null,
        h('button', { class: 'big-btn', onclick: next }, nextLabel()),
        saveNow(),
      );
      paint();
    },

    describe() {
      // Colours, size and count on one screen: three rows to tap, all optional.
      const grid = h('div', { class: 'colour-grid compact' });
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
      const pickRow = <T extends string>(items: { id: T; emoji: string; label: string }[], get: () => T | undefined, set: (v: T | undefined) => void) => {
        const row = h('div', { class: 'mini-choices' });
        const paint = () => row.replaceChildren(...items.map(it => h('button', {
          class: `mini-choice ${get() === it.id ? 'on' : ''}`, 'aria-pressed': String(get() === it.id),
          onclick: () => { const off = get() === it.id; set(off ? undefined : it.id); sounds.pick(); if (!off) say(it.label); paint(); },
        }, h('span', { class: 'mini-emoji' }, it.emoji), it.label)));
        paint();
        return row;
      };
      put(
        title(),
        h('h3', { class: 'describe-head' }, '🎨 Colours'), grid,
        h('h3', { class: 'describe-head' }, '📏 How big?'), pickRow(SIZES, () => draft.size, v => { draft.size = v; }),
        h('h3', { class: 'describe-head' }, '🔢 How many?'), pickRow(COUNTS, () => draft.count, v => { draft.count = v; }),
        h('button', { class: 'big-btn', onclick: next }, nextLabel()),
        saveNow(),
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
      if (editing) fix = steadyNow() ?? fix;
      put(title(), cards, note, h('button', { class: 'big-btn', onclick: next }, nextLabel()), saveNow());
      paint();
      if (!fix && !editing) void bestFix(8000, 30).then(f => { if (f) { fix = f; if (place.kind === 'none') place = { kind: 'gps' }; paint(); } });
    },

    tell() {
      const cat = categoryOf(draft.category!);
      const parts: (Node | null)[] = [title()];
      parts.push(voiceNotes(draft.voices, list => { draft.voices = list; }, note => mayRemove('voice note', savedVoice(note), true)));
      if (!editing) {
        // Where it goes, stated rather than asked (the Where question comes only when the GPS cannot answer).
        const acc = fix ? accuracyWords(fix.accuracy) : null;
        const said = place.kind === 'map' ? '📍 On the map, at the spot you chose'
          : place.kind === 'gps' && acc ? `📍 Where you're standing · ${acc.text}`
          : '📖 In your sticker book (not on the map)';
        parts.push(h('div', { class: 'place-line' }, h('span', {}, said),
          h('button', { class: 'text-btn inline', onclick: changePlace }, '✏️ Change')));
      }
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
      // Save sits right under what most finds need; the name and the grown-up note are extras below it.
      parts.push(editing
        ? h('button', { class: 'big-btn', onclick: next }, '✅ Done')
        : h('button', { class: 'big-btn save-btn', onclick: () => void finish() }, 'Save my find! ✨'));
      if (!sprout) {
        const name = h('input', { class: 'text-in', placeholder: 'e.g. Sammy the Snail', maxlength: 40, value: draft.nickname ?? '' }) as HTMLInputElement;
        name.addEventListener('input', () => { draft.nickname = name.value.trim() || undefined; });
        parts.push(h('label', { class: 'field' }, h('span', {}, '🏷️ Give it a name (if you like)'), name));
      }
      if (together) {
        const note = h('textarea', { class: 'text-in', rows: 3, placeholder: 'What did you notice together?', maxlength: 600 }) as HTMLTextAreaElement;
        note.value = draft.note ?? '';
        note.addEventListener('input', () => { draft.note = note.value.trim() || undefined; });
        parts.push(
          h('div', { class: 'talk-card' }, h('h3', {}, '💬 Talk about it'), h('ul', {}, ...cat.talk.map(t => h('li', {}, t)))),
          h('label', { class: 'field' }, h('span', {}, '✏️ Grown-up note'), note),
        );
      }
      put(...parts);
    },
  };

  let saving = false;
  async function finish() {
    if (saving) return;
    saving = true;
    leave();
    const first = draft.pictures[0];
    const sameFirst = existing && existing.pictures[0]?.id === first?.id;
    const thumb = !first ? undefined : sameFirst && existing?.thumb ? existing.thumb : await downscale(first.blob, 240, 0.8).catch(() => undefined);
    const where: Pick<Find, 'lat' | 'lon' | 'accuracy' | 'placeBy'> =
      place.kind === 'keep' ? { lat: existing!.lat, lon: existing!.lon, accuracy: existing!.accuracy, placeBy: existing!.placeBy }
      : place.kind === 'map' ? { lat: place.lat, lon: place.lon, placeBy: 'map' }
      : place.kind === 'gps' && fix ? { lat: fix.lat, lon: fix.lon, accuracy: Math.round(fix.accuracy), placeBy: 'gps' }
      : {};
    const find: FullFind = {
      id: existing?.id ?? uid(),
      profileId: existing?.profileId ?? host.profile.id,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      ...(editing ? { editedAt: new Date().toISOString() } : {}),
      category: draft.category!,
      ...(draft.category === 'sign' && draft.sign ? { sign: draft.sign } : {}),
      ...(draft.species ? { species: draft.species } : {}),
      ...(draft.habitat && hasPlaceStep(draft.category!) ? { habitat: draft.habitat } : {}),
      colours: draft.colours,
      size: draft.size,
      count: draft.count,
      nickname: draft.nickname,
      note: draft.note,
      pictures: draft.pictures,
      thumb,
      voices: draft.voices,
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
    paintNav();
    body.replaceChildren();
    body.scrollTop = 0;
    const cat = draft.category ? categoryOf(draft.category) : null;
    const row = (st: Step, emoji: string | Node, label: string, value: Node | string) =>
      h('button', { class: 'edit-row', onclick: () => { sounds.tap(); followUps = []; goStep(st); } },
        typeof emoji === 'string' ? h('span', { class: 'edit-emoji' }, emoji) : emoji,
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
    const story = [draft.voices.length ? `🎤 ${draft.voices.length} voice ${draft.voices.length === 1 ? 'note' : 'notes'}` : '', draft.nickname ? `🏷️ ${draft.nickname}` : '', draft.note ? '✏️ Grown-up note' : ''].filter(Boolean).join(' · ') || 'Nothing yet';
    put(
      buddySays(guide, { text: 'Tap the part you want to change!', pose: 'point' }),
      h('div', { class: 'edit-list' },
        row('picture', '📷', 'Pictures', thumbs),
        row('category', cat ? kindIcon(cat, 'edit-emoji') : '❓', 'What it is', cat ? kindWords(cat) : '—'),
        draft.category === 'sign' ? row('sign', sign?.emoji ?? '🐾', 'The clue', sign?.label ?? 'Not picked') : null,
        draft.category && hasPlaceStep(draft.category) ? row('place', '🏞️', 'What kind of place', draft.habitat?.name ?? 'Not said yet') : null,
        draft.category && (hasSpeciesStep(draft.category) || draft.species) ? row('species', '📚', 'Its name', draft.species?.name ?? 'Not named yet') : null,
        row('describe', '🎨', 'Colours, size and count', h('span', {}, colourDots, ` ${size ? `${size.emoji} ${size.label}` : ''} ${cnt ? `${cnt.emoji} ${cnt.label}` : ''}`)),
        row('where', '📍', 'Where', where),
        row('tell', '💬', together ? 'Voice notes, name and note' : 'Voice notes and name', story),
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
