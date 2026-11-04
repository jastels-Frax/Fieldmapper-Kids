/**
 * What to do when the database CONNECTION fails, rather than the request: forget it, wait a moment and run the
 * request again on a fresh one. Pure (the opener and the clock are handed in), so it is unit-tested; storage.ts runs
 * every request through it.
 *
 * Why: WebKit can drop a page's IndexedDB connection while the app is asleep or in the background ("Connection to
 * Indexed Database server lost. Refresh the page to try again" — WebKit bugs 197050, 235579, 273827), and the fix
 * WebKit's engineers give is to open the database again. Before 2.13 Scout kept the dead connection for the life of
 * the page, so every read and save failed until a reload.
 */

/**
 * The connection failed, not the request: WebKit's lost connection (UnknownError), a connection that is closing or
 * closed (InvalidStateError), or a transaction the browser aborted (AbortError — a request that failed for a real
 * reason, such as no space, rejects with that reason instead).
 */
export function connectionLost(err: unknown): boolean {
  const name = (err as { name?: unknown } | null)?.name;
  return name === 'UnknownError' || name === 'InvalidStateError' || name === 'AbortError';
}

/** The device has no room left: the one failure where "check there is space" is the truth. */
export function outOfSpace(err: unknown): boolean {
  return (err as { name?: unknown } | null)?.name === 'QuotaExceededError';
}

/** How long to wait before each further try: two more tries, then the error is the answer. */
export const RETRY_WAIT_MS: readonly number[] = [250, 1000];

/**
 * Runs `fn` on the connection `open` gives. When the connection failed (`connectionLost`), `forget` is told which
 * connection failed (so it is never handed out again), and `fn` runs again on a new one after a wait. Any other
 * error, or the last try's, is thrown as it is. Safe because every request Scout makes is a put, a delete or a read
 * by key, and a transaction that failed committed nothing.
 */
export async function withRetry<D, T>(
  open: () => Promise<D>,
  forget: (used: Promise<D>) => void,
  fn: (d: D) => Promise<T>,
  waits: readonly number[] = RETRY_WAIT_MS,
  sleep: (ms: number) => Promise<void> = ms => new Promise(r => setTimeout(r, ms)),
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const used = open();
    try {
      return await fn(await used);
    } catch (err) {
      if (!connectionLost(err) || attempt >= waits.length) throw err;
      forget(used);
      await sleep(waits[attempt]);
    }
  }
}
