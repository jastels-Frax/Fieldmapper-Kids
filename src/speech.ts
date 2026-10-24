import { CHARACTER_VOICES, castVoices, pickVoice } from './voiceRank.ts';
import { activeGuide } from './guides.ts';
import type { GuideId } from './types.ts';

/**
 * Reads words aloud with the device's own speech voices: nothing is sent over
 * the network, and it works offline. By default every character speaks in a
 * voice of their own (voiceRank.castVoices: a different installed voice where
 * there are enough, plus their own pitch and pace); a grown-up can choose one
 * voice for everyone instead, the best installed or one they picked.
 */
export type VoiceMode = 'characters' | 'one';

let enabled = true;
let mode: VoiceMode = 'characters';
let chosenURI: string | undefined;
let voice: SpeechSynthesisVoice | null = null;
let cast: Record<GuideId, SpeechSynthesisVoice | null> | null = null;
/** Who reads the words no character is saying (the screens, the toasts): the explorer's own guide. */
let narrator: GuideId = 'frog';

function synth(): SpeechSynthesis | null {
  return 'speechSynthesis' in window ? window.speechSynthesis : null;
}

function refreshVoice(): void {
  const s = synth();
  if (!s) return;
  const all = s.getVoices();
  voice = pickVoice(all, chosenURI);
  cast = castVoices(all);
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

export function setVoiceMode(m: VoiceMode): void {
  mode = m;
}

/** The explorer's chosen guide. Scout stands in while the Field Journal look is on (guides.activeGuide). */
export function setNarrator(g: GuideId): void {
  narrator = g;
}

export function currentVoice(): SpeechSynthesisVoice | null {
  return voice;
}

/** The installed voice a character speaks in, in character mode. */
export function characterVoice(g: GuideId): SpeechSynthesisVoice | null {
  return cast?.[g] ?? voice;
}

export function availableVoices(): SpeechSynthesisVoice[] {
  return synth()?.getVoices() ?? [];
}

function utter(text: string, v: SpeechSynthesisVoice | null, pitch = 1, rate = 0.97): void {
  const s = synth();
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-CA';
  u.rate = rate;
  u.pitch = pitch;
  s.speak(u);
}

function speakAs(text: string, who: GuideId): void {
  if (mode === 'one') { utter(text, voice); return; }
  const c = CHARACTER_VOICES[who];
  utter(text, characterVoice(who), c.pitch, c.rate * 0.97);
}

/** Reads `text` aloud as `speaker`, or as the explorer's guide when no one in particular is speaking. */
export function say(text: string, speaker?: GuideId): void {
  if (!enabled) return;
  speakAs(text, speaker ?? activeGuide(narrator));
}

/** Plays a voice once, whatever the read-aloud switch says: for choosing one. */
export function preview(text: string, v: SpeechSynthesisVoice): void {
  utter(text, v);
}

/** Plays a character's own voice once, whatever the switches say: for the grown-ups' list. */
export function previewCharacter(text: string, who: GuideId): void {
  const c = CHARACTER_VOICES[who];
  utter(text, characterVoice(who), c.pitch, c.rate * 0.97);
}
