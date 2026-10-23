/** Reads words aloud, for explorers still learning to read. */
let enabled = true;

export function setReadAloud(on: boolean): void {
  enabled = on;
  if (!on) window.speechSynthesis?.cancel();
}

export function say(text: string): void {
  if (!enabled || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.pitch = 1.15;
  synth.speak(u);
}
