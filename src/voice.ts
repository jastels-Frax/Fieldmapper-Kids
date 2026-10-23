import { h } from './ui.ts';
import { say } from './speech.ts';

export const MAX_VOICE_MS = 30_000;

export function canRecord(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/** A record / play control. `onChange` hears the newest recording (or null when removed). */
export function voiceControl(initial: Blob | undefined, onChange: (b: Blob | null) => void): HTMLElement {
  let blob: Blob | null = initial ?? null;
  let rec: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let stopTimer: number | undefined;
  let audio: HTMLAudioElement | null = null;

  const status = h('p', { class: 'voice-status' });
  const recBtn = h('button', { class: 'voice-rec', type: 'button', 'aria-label': 'Record' }, '🎤');
  const playBtn = h('button', { class: 'round-btn', type: 'button', 'aria-label': 'Play' }, '▶️');
  const delBtn = h('button', { class: 'round-btn', type: 'button', 'aria-label': 'Remove recording' }, '🗑️');

  const paint = () => {
    const recording = rec?.state === 'recording';
    recBtn.classList.toggle('recording', recording);
    recBtn.textContent = recording ? '⏹️' : '🎤';
    playBtn.hidden = !blob || recording;
    delBtn.hidden = !blob || recording;
    status.textContent = recording ? 'Listening… tap to stop' : blob ? 'Got it! Tap ▶️ to listen.' : 'Tap the microphone and tell me about it!';
  };

  const stop = () => {
    clearTimeout(stopTimer);
    if (rec?.state === 'recording') rec.stop();
  };

  recBtn.addEventListener('click', async () => {
    if (rec?.state === 'recording') return stop();
    if (!canRecord()) {
      status.textContent = 'This device cannot record sound.';
      return;
    }
    try {
      window.speechSynthesis?.cancel();
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      status.textContent = 'Ask a grown-up to let this app use the microphone.';
      return;
    }
    const chunks: Blob[] = [];
    rec = new MediaRecorder(stream);
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream?.getTracks().forEach(t => t.stop());
      stream = null;
      if (chunks.length) {
        blob = new Blob(chunks, { type: rec?.mimeType || chunks[0].type || 'audio/webm' });
        onChange(blob);
      }
      paint();
    };
    rec.start();
    stopTimer = window.setTimeout(stop, MAX_VOICE_MS);
    paint();
  });

  playBtn.addEventListener('click', () => {
    if (!blob) return;
    audio?.pause();
    const url = URL.createObjectURL(blob);
    audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    void audio.play();
  });

  delBtn.addEventListener('click', () => {
    blob = null;
    onChange(null);
    paint();
    say('Okay, gone!');
  });

  paint();
  const wrap = h('div', { class: 'voice' }, h('div', { class: 'voice-row' }, recBtn, playBtn, delBtn), status);
  // Stop the microphone if the screen holding the control goes away mid-recording.
  const obs = new MutationObserver(() => {
    if (!wrap.isConnected) {
      stop();
      stream?.getTracks().forEach(t => t.stop());
      obs.disconnect();
    }
  });
  queueMicrotask(() => obs.observe(document.body, { childList: true, subtree: true }));
  return wrap;
}
