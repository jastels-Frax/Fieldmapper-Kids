import { h } from './ui.ts';
import { checkGateAnswer, makeGateQuestion } from './gate.ts';
import { sounds } from './sound.ts';

const HOLD_MS = 2000;

/**
 * Asks for a grown-up: hold a button for two seconds, then answer a sum.
 * Resolves true only when both were done.
 */
export function askGrownUp(reason: string): Promise<boolean> {
  return new Promise(resolve => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      overlay.remove();
      resolve(ok);
    };
    const q = makeGateQuestion();
    const fill = h('span', { class: 'hold-fill' });
    const holdBtn = h('button', { class: 'hold-btn' }, fill, h('span', { class: 'hold-label' }, 'Grown-ups: press and hold'));
    const input = h('input', { class: 'gate-input', inputmode: 'numeric', autocomplete: 'off', 'aria-label': 'Answer' }) as HTMLInputElement;
    const err = h('p', { class: 'gate-error', role: 'alert' });
    const step2 = h('form', { class: 'gate-step2', hidden: true },
      h('p', { class: 'gate-q' }, q.text), input,
      h('button', { class: 'big-btn', type: 'submit' }, 'OK'),
      err,
    );
    step2.addEventListener('submit', e => {
      e.preventDefault();
      if (checkGateAnswer(q, input.value)) finish(true);
      else {
        sounds.oops();
        err.textContent = 'Not quite. Try again.';
        input.value = '';
      }
    });

    let timer: number | undefined;
    let started = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - started) / HOLD_MS);
      fill.style.width = `${p * 100}%`;
      if (p >= 1) {
        holdBtn.hidden = true;
        step2.hidden = false;
        input.focus();
        return;
      }
      timer = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(timer!);
      if (!holdBtn.hidden) fill.style.width = '0%';
    };
    holdBtn.addEventListener('pointerdown', e => {
      e.preventDefault();
      started = performance.now();
      timer = requestAnimationFrame(tick);
    });
    holdBtn.addEventListener('pointerup', stop);
    holdBtn.addEventListener('pointerleave', stop);
    holdBtn.addEventListener('pointercancel', stop);
    holdBtn.addEventListener('contextmenu', e => e.preventDefault());

    const overlay = h('div', { class: 'gate-overlay', role: 'dialog', 'aria-label': 'Grown-ups only' },
      h('div', { class: 'gate-card' },
        h('div', { class: 'gate-lock' }, '🔒'),
        h('h2', {}, 'Grown-ups only'),
        h('p', { class: 'gate-reason' }, reason),
        holdBtn, step2,
        h('button', { class: 'text-btn', onclick: () => finish(false) }, 'Cancel'),
      ),
    );
    document.body.append(overlay);
  });
}
