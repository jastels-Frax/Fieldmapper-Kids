import { h } from './ui.ts';
import { say } from './speech.ts';

export const MAX_VOICE_MS = 30_000;
/** Voice notes one find can hold. */
export const MAX_VOICE_NOTES = 6;

export function canRecord(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Voice notes: each one a row to play or remove, and the big microphone to record one — with a ➕ once there is a
 * note, for "and another thing!". `onChange` hears the whole list after every change.
 */
/** `mayRemove`: asked before a note is removed (capture.ts asks, and a saved note needs a grown-up). */
export function voiceNotes(initial: Blob[], onChange: (notes: Blob[]) => void, mayRemove: (note: Blob) => Promise<boolean> = async () => true): HTMLElement {
  const notes: Blob[] = [...initial];
  let rec: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let stopTimer: number | undefined;
  let audio: HTMLAudioElement | null = null;
  /** The microphone is being asked for: a second tap meanwhile must not start a second recording. */
  let starting = false;

  const list = h('div', { class: 'voice-list' });
  const status = h('p', { class: 'voice-status' });
  const recBtn = h('button', { class: 'voice-rec', type: 'button' });

  const play = (b: Blob) => {
    audio?.pause();
    const url = URL.createObjectURL(b);
    audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    void audio.play();
  };

  const paint = () => {
    const recording = rec?.state === 'recording';
    const full = notes.length >= MAX_VOICE_NOTES;
    recBtn.classList.toggle('recording', recording);
    recBtn.classList.toggle('more', !recording && notes.length > 0);
    recBtn.replaceChildren(recording ? '⏹️' : notes.length ? h('span', { class: 'voice-more' }, '➕🎤') : '🎤');
    recBtn.setAttribute('aria-label', recording ? 'Stop recording' : notes.length ? 'Record another voice note' : 'Record a voice note');
    recBtn.hidden = full && !recording;
    list.replaceChildren(...notes.map((b, i) => h('div', { class: 'voice-note' },
      h('button', { class: 'round-btn small', type: 'button', 'aria-label': `Play voice note ${i + 1}`, onclick: () => play(b) }, '▶️'),
      h('span', { class: 'voice-note-name' }, `🎵 Voice note ${i + 1}`),
      h('button', { class: 'round-btn small voice-del', type: 'button', 'aria-label': `Remove voice note ${i + 1}`, onclick: async () => {
        if (!(await mayRemove(b))) return;
        const at = notes.indexOf(b);
        if (at < 0) return;
        notes.splice(at, 1);
        onChange([...notes]);
        paint();
        say('Okay, gone!');
      } }, '🗑️'))));
    status.textContent = recording ? 'Listening… tap to stop'
      : full ? `That's ${MAX_VOICE_NOTES} voice notes, the most one find can hold.`
      : notes.length ? 'Got it! Tap ➕ to tell me more.'
      : 'Tap the microphone and tell me about it!';
  };

  const stop = () => {
    clearTimeout(stopTimer);
    if (rec?.state === 'recording') rec.stop();
  };

  recBtn.addEventListener('click', async () => {
    if (rec?.state === 'recording') return stop();
    if (starting) return;
    if (!canRecord()) {
      status.textContent = 'This device cannot record sound.';
      return;
    }
    starting = true;
    try {
      window.speechSynthesis?.cancel();
      audio?.pause();
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      status.textContent = 'Ask a grown-up to let this app use the microphone.';
      return;
    } finally {
      starting = false;
    }
    const chunks: Blob[] = [];
    rec = new MediaRecorder(stream);
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream?.getTracks().forEach(t => t.stop());
      stream = null;
      if (chunks.length && notes.length < MAX_VOICE_NOTES) {
        notes.push(new Blob(chunks, { type: rec?.mimeType || chunks[0].type || 'audio/webm' }));
        onChange([...notes]);
      }
      paint();
    };
    rec.start();
    stopTimer = window.setTimeout(stop, MAX_VOICE_MS);
    paint();
  });

  paint();
  const wrap = h('div', { class: 'voice' }, list, h('div', { class: 'voice-row' }, recBtn), status);
  // Stop the microphone if the screen holding the control goes away mid-recording.
  const obs = new MutationObserver(() => {
    if (!wrap.isConnected) {
      stop();
      stream?.getTracks().forEach(t => t.stop());
      audio?.pause();
      obs.disconnect();
    }
  });
  queueMicrotask(() => obs.observe(document.body, { childList: true, subtree: true }));
  return wrap;
}
