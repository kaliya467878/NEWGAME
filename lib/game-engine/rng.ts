import crypto from "crypto";

/**
 * Cryptographically secure RNG service for server-side game resolution.
 */
export function secureRandomInt(minInclusive: number, maxExclusive: number): number {
  return crypto.randomInt(minInclusive, maxExclusive);
}

export function secureRandomFloat(): number {
  const buf = crypto.randomBytes(4);
  const num = buf.readUInt32BE(0);
  return num / 0xffffffff;
}

export function pickRandomItem<T>(items: T[]): T {
  const idx = secureRandomInt(0, items.length);
  return items[idx];
}

export function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = secureRandomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
