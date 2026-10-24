/**
 * Pictures, drawings, thumbnails, voice notes and profile photos are stored in IndexedDB as BYTES, never as
 * Blobs. Safari keeps a stored Blob as a separate file that a page can lose its hold on: a photo read back
 * from the database became a broken image after an edit was saved, and then just from opening the find,
 * typically in a home-screen app after a spell in the background (WebKitBlobResource error 1). An
 * ArrayBuffer is stored inside the record itself and comes back as ordinary memory, so there is no file to
 * lose. Pure, so the round trip is tested under Node.
 */
export interface StoredBytes {
  __bytes: ArrayBuffer;
  type: string;
}

export function isStoredBytes(v: unknown): v is StoredBytes {
  return !!v && typeof v === 'object' && (v as StoredBytes).__bytes instanceof ArrayBuffer && typeof (v as StoredBytes).type === 'string';
}

export async function toBytes(b: Blob): Promise<StoredBytes> {
  return { __bytes: await b.arrayBuffer(), type: b.type };
}

export function fromBytes(s: StoredBytes): Blob {
  return new Blob([s.__bytes], { type: s.type });
}

/**
 * One stored value back to a Blob the page holds in memory.
 * - bytes (the current format): rebuilt, nothing else to do;
 * - a Blob (stored before this format): read into memory now, while it can still be read, and flagged
 *   `legacy` so the record is rewritten as bytes;
 * - a Blob Safari can no longer read: returned as it is and flagged `lost`, and the record is NOT rewritten,
 *   because rewriting it is what would delete the file for good.
 */
export async function revive(v: unknown): Promise<{ blob?: Blob; legacy: boolean; lost: boolean }> {
  if (v == null) return { legacy: false, lost: false };
  if (isStoredBytes(v)) return { blob: fromBytes(v), legacy: false, lost: false };
  if (v instanceof Blob) {
    try {
      return { blob: new Blob([await v.arrayBuffer()], { type: v.type }), legacy: true, lost: false };
    } catch {
      return { blob: v, legacy: true, lost: true };
    }
  }
  return { legacy: false, lost: false };
}
