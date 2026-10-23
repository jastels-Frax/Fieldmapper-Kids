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
