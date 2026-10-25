import type { CategoryId, Find } from './types.ts';

/** The kinds offered when an explorer has few finds of their own yet. */
export const DEFAULT_QUICK: CategoryId[] = ['bird', 'flower', 'bug'];

/**
 * Which kinds the quick-find buttons offer: the explorer's own most-found kinds (ties to the one found most
 * recently), topped up from `DEFAULT_QUICK`, so the buttons are the finds this child actually makes. Pure.
 * `finds` are newest first, as App holds them.
 */
export function quickKinds(finds: Pick<Find, 'category'>[], n = 3): CategoryId[] {
  const tally = new Map<CategoryId, { count: number; newest: number }>();
  finds.forEach((f, i) => {
    const t = tally.get(f.category);
    if (t) t.count++;
    else tally.set(f.category, { count: 1, newest: i });
  });
  const mine = [...tally.entries()]
    .filter(([c]) => c !== 'mystery')
    .sort((a, b) => b[1].count - a[1].count || a[1].newest - b[1].newest)
    .map(([c]) => c);
  const out = mine.slice(0, n);
  for (const c of DEFAULT_QUICK) if (out.length < n && !out.includes(c)) out.push(c);
  return out;
}
