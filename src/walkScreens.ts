import type { Profile } from './types.ts';
import { askYesNo, h, openSheet, toast } from './ui.ts';
import { say } from './speech.ts';
import { sounds } from './sound.ts';
import { confetti } from './confetti.ts';
import { buddySays } from './buddyView.ts';
import { askGrownUp } from './gateView.ts';
import { distanceWords, durationWords, walkDurationMs, walkLengthM, type Walk } from './walk.ts';

export interface WalkHost {
  profile: Profile;
  walks: () => Walk[];
  save: (w: Walk) => Promise<void>;
  remove: (w: Walk) => Promise<void>;
  show: (w: Walk) => void;
}

/** Straight after "Stop": how far, how long, a name, keep or throw away. */
export function finishWalk(host: WalkHost, w: Walk): void {
  const m = walkLengthM(w.points);
  const g = host.profile.guide;
  const { body, close } = openSheet({ title: 'My path', emoji: '👣', className: 'walk-done' });
  if (w.points.length < 2) {
    body.append(
      buddySays(g, { text: "I couldn't see you move yet, so there is no path to keep. Try walking a bit further next time!", pose: 'confused' }),
      h('button', { class: 'big-btn', onclick: async () => { await host.remove(w); close(); } }, '👍 OK'),
    );
    return;
  }
  const text = `You walked ${distanceWords(m)} in ${durationWords(walkDurationMs(w))}! Want to give your path a name?`;
  const name = h('input', { class: 'text-in', maxlength: 40, placeholder: 'e.g. Pond loop', 'aria-label': 'Path name' }) as HTMLInputElement;
  body.append(
    buddySays(g, { text, pose: 'success' }, { big: true }),
    h('div', { class: 'walk-stats' },
      h('div', {}, h('strong', {}, distanceWords(m)), h('span', {}, 'walked')),
      h('div', {}, h('strong', {}, durationWords(walkDurationMs(w))), h('span', {}, 'exploring'))),
    h('label', { class: 'field' }, h('span', {}, '🏷️ Name (if you like)'), name),
    h('button', { class: 'big-btn', onclick: async () => {
      await host.save({ ...w, name: name.value.trim() || undefined });
      close();
      host.show(w);
      toast('👣 Path saved');
    } }, '✅ Keep my path'),
    h('button', { class: 'text-btn danger', onclick: async () => {
      if (!(await askYesNo('Throw this path away?', '🗑️ Yes', 'Keep it'))) return;
      await host.remove(w);
      close();
    } }, '🗑️ Throw it away'),
  );
  sounds.save();
  confetti(['👣']);
}

/** Every saved path of this explorer. */
export function openWalks(host: WalkHost): void {
  const { body, close } = openSheet({ title: 'My paths', emoji: '👣', className: 'walks' });
  const paint = () => {
    body.replaceChildren();
    const list = host.walks().filter(w => w.endedAt);
    const total = list.reduce((n, w) => n + walkLengthM(w.points), 0);
    body.append(buddySays(host.profile.guide, list.length
      ? { text: `You have ${list.length} ${list.length === 1 ? 'path' : 'paths'}: ${distanceWords(total)} in all!`, pose: 'excited' }
      : { text: 'No paths yet. Tap the footprints on the map to record one!', pose: 'point' }));
    for (const w of list) {
      const m = walkLengthM(w.points);
      const when = new Date(w.startedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
      body.append(h('div', { class: 'maker-row walk-row' },
        h('span', { class: 'hunt-item-emoji' }, '👣'),
        h('span', { class: 'maker-text' }, h('strong', {}, w.name || when), h('br'),
          h('span', { class: 'hint' }, `${w.name ? `${when} · ` : ''}${distanceWords(m)} · ${durationWords(walkDurationMs(w))}`)),
        h('button', { class: 'round-btn small', 'aria-label': 'Show on map', onclick: () => { document.querySelectorAll('.sheet').forEach(x => x.remove()); host.show(w); } }, '🗺️'),
        h('button', { class: 'round-btn small', 'aria-label': 'Delete this path', onclick: async () => {
          const ok = host.profile.mode === 'together'
            ? await askYesNo('Delete this path?', '🗑️ Delete', 'Keep')
            : await askGrownUp('Deleting a path cannot be undone.');
          if (!ok) return;
          await host.remove(w);
          paint();
        } }, '🗑️')));
    }
  };
  paint();
  void close;
  say(host.walks().length ? 'Here are your paths!' : 'No paths yet.');
}
