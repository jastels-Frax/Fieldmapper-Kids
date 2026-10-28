import { h } from './ui.ts';
import { afterMiss, checkGateAnswer, makeGateQuestion, pausedFor, readLock, type GateLock } from './gate.ts';
import { sounds } from './sound.ts';
import { critterFigure } from './buddyView.ts';

const HOLD_MS = 2000;
/** Wrong answers and a pause outlive the card and a reload (gate.ts readLock reads them back safely). */
const LOCK_KEY = 'scout.gate.lock';
const loadLock = (): GateLock => { try { return readLock(localStorage.getItem(LOCK_KEY), Date.now()); } catch { return readLock(null, Date.now()); } };
const storeLock = (l: GateLock) => { try { localStorage.setItem(LOCK_KEY, JSON.stringify(l)); } catch { /* private mode: this session only */ } };

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
      clearTimeout(pauseTimer);
      overlay.remove();
      resolve(ok);
    };
    let q = makeGateQuestion();
    let lock = loadLock();
    const fill = h('span', { class: 'hold-fill' });
    const holdBtn = h('button', { class: 'hold-btn' }, fill, h('span', { class: 'hold-label' }, 'Grown-ups: press and hold'));
    const input = h('input', { class: 'gate-input', inputmode: 'numeric', autocomplete: 'off', 'aria-label': 'Answer' }) as HTMLInputElement;
    const err = h('p', { class: 'gate-error', role: 'alert' });
    const qText = h('p', { class: 'gate-q' }, q.text);
    const okBtn = h('button', { class: 'big-btn', type: 'submit' }, 'OK') as HTMLButtonElement;
    const step2 = h('form', { class: 'gate-step2', hidden: true }, qText, input, okBtn, err);
    /** While paused: the sum is hidden and the countdown shown, until it opens again. */
    let pauseTimer: number | undefined;
    const showPause = () => {
      const left = pausedFor(lock, Date.now());
      const paused = left > 0;
      input.disabled = paused;
      okBtn.disabled = paused;
      qText.hidden = paused;
      if (paused) {
        err.textContent = `Too many tries. Please wait ${Math.ceil(left / 1000)} seconds.`;
        pauseTimer = window.setTimeout(showPause, 1000);
      } else if (pauseTimer !== undefined) {
        pauseTimer = undefined;
        err.textContent = '';
        q = makeGateQuestion();
        qText.textContent = q.text;
        input.focus();
      }
    };
    step2.addEventListener('submit', e => {
      e.preventDefault();
      if (pausedFor(lock, Date.now()) > 0) return;
      if (checkGateAnswer(q, input.value)) {
        lock = { misses: 0, until: 0 };
        storeLock(lock);
        finish(true);
        return;
      }
      sounds.oops();
      input.value = '';
      lock = afterMiss(lock, Date.now());
      storeLock(lock);
      // A new sum every time: one sum cannot be worked out by trying numbers.
      q = makeGateQuestion();
      qText.textContent = q.text;
      err.textContent = 'Not quite. Here is a new one.';
      showPause();
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
        showPause();
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
        critterFigure('bear', 'point', 'buddy-fig gate-fig'),
        h('h2', {}, 'Grown-ups only'),
        h('p', { class: 'gate-reason' }, `Ranger Bramble says: this part is for grown-ups. ${reason}`),
        holdBtn, step2,
        h('button', { class: 'text-btn', onclick: () => finish(false) }, 'Cancel'),
      ),
    );
    document.body.append(overlay);
  });
}
