/**
 * The grown-up gate: a question a 5-10 year old is unlikely to answer in a
 * hurry, asked after a long press. It keeps settings, deleting and export out
 * of reach of a curious tap; it is not security.
 */
export interface GateQuestion {
  text: string;
  answer: number;
}

export function makeGateQuestion(rand: () => number = Math.random): GateQuestion {
  const a = 12 + Math.floor(rand() * 8);   // 12-19
  const b = 6 + Math.floor(rand() * 4);    // 6-9
  return { text: `${a} × ${b} = ?`, answer: a * b };
}

export function checkGateAnswer(q: GateQuestion, typed: string): boolean {
  const n = Number(typed.trim());
  return typed.trim() !== '' && Number.isInteger(n) && n === q.answer;
}

/** Wrong answers in a row before the gate pauses. */
export const GATE_MISSES = 3;
/** How long it pauses for. A grown-up waits a minute; a child guessing gives up. */
export const GATE_PAUSE_MS = 60_000;

/** The gate's memory of wrong answers: how many in a row, and the pause they earned (epoch ms, 0 = none). */
export interface GateLock {
  misses: number;
  until: number;
}

export const OPEN_LOCK: GateLock = { misses: 0, until: 0 };

/**
 * After a wrong answer. Each miss gets a NEW sum (gateView), so a child cannot work one sum out by trying numbers;
 * the third miss in a row pauses the gate for a minute, and the count starts again.
 */
export function afterMiss(lock: GateLock, now: number): GateLock {
  const misses = lock.misses + 1;
  return misses >= GATE_MISSES ? { misses: 0, until: now + GATE_PAUSE_MS } : { misses, until: lock.until };
}

/** Milliseconds the gate is still paused for; 0 when it is open. */
export function pausedFor(lock: GateLock, now: number): number {
  return Math.max(0, lock.until - now);
}

/** A stored lock, read safely: anything unreadable is an open gate with no misses (never a pause for ever). */
export function readLock(raw: string | null, now: number): GateLock {
  try {
    const o = JSON.parse(raw ?? '') as Partial<GateLock>;
    const misses = Number.isInteger(o.misses) && o.misses! > 0 ? Math.min(o.misses!, GATE_MISSES - 1) : 0;
    // A pause longer than one pause from now is a clock change or a hand-edited value: never trust it.
    const until = typeof o.until === 'number' && o.until > now && o.until <= now + GATE_PAUSE_MS ? o.until : 0;
    return { misses, until };
  } catch {
    return OPEN_LOCK;
  }
}
