/**
 * Deterministic seeded random number generator using mulberry32 algorithm.
 * Used server-side to deterministically pick xforceBoltIdx from orderId.
 * The result is NEVER exposed to the client.
 */

/**
 * Converts a string seed to a uint32 via djb2 hash, then runs mulberry32.
 * Returns a float in [0, 1).
 */
export function seededRandom(seed: string): number {
  // djb2 hash: convert string seed to uint32
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }

  // mulberry32 PRNG
  h = (h + 0x6d2b79f5) | 0;
  let t = Math.imul(h ^ (h >>> 15), 1 | h);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Picks a bolt index in [0, totalBolts) deterministically from an orderId.
 * Same orderId always returns the same bolt index.
 */
export function pickXForceBoltIdx(orderId: string, totalBolts: number): number {
  return Math.floor(seededRandom(orderId) * totalBolts);
}
