import { pickVoice } from './voiceRank.ts';

/**
 * Reads words aloud with the device's own speech voices: nothing is sent over
 * the network, and it works offline. The best-sounding installed English voice
 * is used unless a grown-up chose one.
 */
let enabled = true;
let chosenURI: string | undefined;
let voice: SpeechSynthesisVoice | null = null;

function synth(): SpeechSynthesis | null {
  return 'speechSynthesis' in window ? window.speechSynthesis : null;
}

function refreshVoice(): void {
  const s = synth();
  if (!s) return;
  voice = pickVoice(s.getVoices(), chosenURI);
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoice();
  // Chrome loads its voice list after the page; Safari has it at once.
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoice);
}

export function setReadAloud(on: boolean): void {
  enabled = on;
  if (!on) synth()?.cancel();
}

export function readAloudOn(): boolean {
  return enabled;
}

export function setVoice(uri: string | undefined): void {
  chosenURI = uri;
  refreshVoice();
}

export function currentVoice(): SpeechSynthesisVoice | null {
  return voice;
}

export function availableVoices(): SpeechSynthesisVoice[] {
  return synth()?.getVoices() ?? [];
}

function utter(text: string, v: SpeechSynthesisVoice | null): void {
  const s = synth();
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-CA';
  // A natural voice sounds best at its own pace and pitch; nudging the pitch up is what made it sound like a toy robot.
  u.rate = 0.97;
  u.pitch = 1;
  s.speak(u);
}

export function say(text: string): void {
  if (!enabled) return;
  utter(text, voice);
}

/** Plays a voice once, whatever the read-aloud switch says: for choosing one. */
export function preview(text: string, v: SpeechSynthesisVoice): void {
  utter(text, v);
}
