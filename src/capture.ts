import type { CategoryId, ColourId, Find, Settings } from './types.ts';
import { CATEGORIES, COLOURS, COUNTS, SIZES, categoryOf } from './categories.ts';
import { askYesNo, blobUrl, h, openSheet, toast, uid } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { downscale } from './image.ts';
import { drawPad } from './drawPad.ts';
import { voiceControl } from './voice.ts';
import { lastFix } from './gps.ts';
import { buddySays } from './buddyView.ts';
import { stepLine } from './buddyLines.ts';
import type { Expression } from './buddies.ts';
import { meetsRule, type HuntItem } from './hunts.ts';
import { toBadgeFind } from './badges.ts';

export interface CaptureHost {
  settings: Settings;
  /** The active scavenger hunt's open items, if a hunt is on. */
  hunt: () => { title: string; emoji: string; open: HuntItem[] } | null;
  save: (f: Find, huntItems: string[]) => Promise<void>;
}

type Step = 'picture' | 'category' | 'colours' | 'size' | 'count' | 'tell';
const STEPS: Step[] = ['picture', 'category', 'colours', 'size', 'count', 'tell'];

/** "I found something!" — one step per screen, big buttons, everything skippable but the kind of thing. */
export function startCapture(host: CaptureHost): void {
  const together = host.settings.mode === 'together';
  // The place is taken when the explorer says "I found something", not after they finish drawing.
  const fix = lastFix();
  const draft: Partial<Find> & { colours: ColourId[] } = { colours: [] };
  let step = 0;
  let pad: ReturnType<typeof drawPad> | null = null;
  let huntPicks: Set<string> | null = null;

  const { body, close, sheet } = openSheet({ title: 'I found something!', emoji: '✨', className: 'capture' });
  // The header back button leaves the whole flow; ask first once something was chosen.
  const back = sheet.querySelector('.back-btn') as HTMLButtonElement;
  back.replaceWith(back.cloneNode(true));
  (sheet.querySelector('.back-btn') as HTMLButtonElement).addEventListener('click', async () => {
    if (step === 0 && !draft.photo) return close();
    if (await askYesNo('Stop and throw this find away?', '🗑️ Yes', '✨ Keep going')) close();
  });
  const dots = h('div', { class: 'step-dots', 'aria-hidden': 'true' }, ...STEPS.map(() => h('span')));
  sheet.querySelector('.sheet-head')!.append(dots);

  const go = (i: number) => {
    step = i;
    // The hunt guesses read the answers; going back to change one re-guesses.
    if (STEPS[i] !== 'tell') huntPicks = null;
    dots.querySelectorAll('span').forEach((d, j) => d.classList.toggle('on', j <= i));
    body.replaceChildren();
    body.scrollTop = 0;
    render[STEPS[i]]();
  };
  const put = (...xs: (Node | null)[]) => body.append(...xs.filter((x): x is Node => !!x));
  const next = () => { sounds.tap(); go(step + 1); };
  const prevBtn = () => step > 0 ? h('button', { class: 'text-btn', onclick: () => go(step - 1) }, '⬅️ Go back') : null;
  const buddy = host.settings.buddy;
  /** Each step is asked by Pip or Hop. */
  const title = (text?: string, pose?: Expression) => {
    const line = stepLine(buddy, STEPS[step]);
    return buddySays(buddy, { text: text ?? line.text, pose: pose ?? line.pose });
  };


  const render: Record<Step, () => void> = {
    picture() {
      const file = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true }) as HTMLInputElement;
      file.addEventListener('change', async () => {
        const f = file.files?.[0];
        if (!f) return;
        try {
          draft.photo = await downscale(f, 1600);
          draft.drawing = undefined;
          sounds.pick();
          showPhoto();
        } catch {
          toast('Hmm, that picture did not work. Try again?');
        }
      });
      const showPhoto = () => {
        body.replaceChildren(
          title('Great picture!', 'excited'),
          h('img', { class: 'preview', alt: 'Your photo', src: blobUrl(draft.photo!, body) }),
          h('div', { class: 'ask-row' },
            h('button', { class: 'big-btn', onclick: next }, '👍 Use it'),
            h('button', { class: 'big-btn soft', onclick: () => file.click() }, '📷 Take another'),
          ),
          file,
        );
      };
      if (draft.photo) return showPhoto();
      if (draft.drawing && pad) return showPad();
      put(
        title(),
        h('div', { class: 'choice-grid three' },
          h('button', { class: 'choice', onclick: () => file.click() }, h('span', { class: 'choice-emoji' }, '📷'), 'Take a photo'),
          h('button', { class: 'choice', onclick: () => showPad() }, h('span', { class: 'choice-emoji' }, '🎨'), 'Draw it'),
          h('button', { class: 'choice', onclick: next }, h('span', { class: 'choice-emoji' }, '👀'), 'Just look'),
        ),
        file,
      );
      function showPad() {
        pad ??= drawPad();
        body.replaceChildren(
          title('Draw what you see!', 'point'),
          pad.el,
          h('div', { class: 'ask-row' },
            h('button', { class: 'big-btn', onclick: async () => {
              const b = await pad!.getBlob();
              if (!b) { say('Draw something first!'); return; }
              draft.drawing = b;
              draft.photo = undefined;
              next();
            } }, '✅ Done drawing'),
            h('button', { class: 'big-btn soft', onclick: () => go(0) }, '⬅️ Back'),
          ),
        );
      }
    },

    category() {
      put(
        title(),
        h('div', { class: 'choice-grid' }, ...CATEGORIES.map(c =>
          h('button', {
            class: `choice ${draft.category === c.id ? 'on' : ''}`, style: `--cat:${c.colour}`,
            onclick: () => {
              draft.category = c.id as CategoryId;
              sounds.pick();
              say(c.cheer);
              setTimeout(next, 700);
            },
          }, h('span', { class: 'choice-emoji' }, c.emoji), c.label),
        )),
        prevBtn(),
      );
    },

    colours() {
      const grid = h('div', { class: 'colour-grid' });
      for (const col of COLOURS) {
        const b = h('button', {
          class: `colour ${draft.colours.includes(col.id) ? 'on' : ''}`, style: `--sw:${col.hex}`, 'aria-label': col.label,
          'aria-pressed': String(draft.colours.includes(col.id)),
        }, h('span', {}, col.label));
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
      put(
        title(),
        grid,
        h('button', { class: 'big-btn', onclick: next }, 'Next ➡️'),
        prevBtn(),
      );
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

    tell() {
      const cat = categoryOf(draft.category!);
      const parts: (HTMLElement | null)[] = [title()];
      parts.push(voiceControl(draft.voice, b => { draft.voice = b ?? undefined; }));
      const hunt = host.hunt();
      if (hunt && hunt.open.length) {
        // Pre-tick what this find meets on its own; the explorer can change it.
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
      if (together) {
        const name = h('input', { class: 'text-in', placeholder: 'e.g. Sammy the Snail', maxlength: 40, value: draft.nickname ?? '' }) as HTMLInputElement;
        name.addEventListener('input', () => { draft.nickname = name.value.trim() || undefined; });
        const note = h('textarea', { class: 'text-in', rows: 3, placeholder: 'What did you notice together?', maxlength: 600 }) as HTMLTextAreaElement;
        note.value = draft.note ?? '';
        note.addEventListener('input', () => { draft.note = note.value.trim() || undefined; });
        parts.push(
          h('div', { class: 'talk-card' },
            h('h3', {}, '💬 Talk about it'),
            h('ul', {}, ...cat.talk.map(t => h('li', {}, t))),
          ),
          h('label', { class: 'field' }, h('span', {}, '🏷️ Give it a name'), name),
          h('label', { class: 'field' }, h('span', {}, '✏️ Grown-up note'), note),
        );
      }
      parts.push(h('button', { class: 'big-btn save-btn', onclick: () => void finish() }, 'Save my find! ✨'), prevBtn());
      put(...parts);
    },
  };

  let saving = false;
  async function finish() {
    if (saving) return;
    saving = true;
    const picture = draft.photo ?? draft.drawing;
    const find: Find = {
      id: uid(),
      createdAt: new Date().toISOString(),
      category: draft.category!,
      colours: draft.colours,
      size: draft.size,
      count: draft.count,
      nickname: draft.nickname,
      note: draft.note,
      photo: draft.photo,
      drawing: draft.drawing,
      voice: draft.voice,
      thumb: picture ? await downscale(picture, 240, 0.8).catch(() => undefined) : undefined,
      ...(fix ? { lat: fix.lat, lon: fix.lon, accuracy: Math.round(fix.accuracy) } : {}),
    };
    try {
      await host.save(find, [...(huntPicks ?? [])]);
      sheet.remove();
    } catch {
      saving = false;
      sounds.oops();
      toast('Oh no, it did not save. Ask a grown-up to check there is space on this device.', 5000);
    }
  }

  go(0);
}
