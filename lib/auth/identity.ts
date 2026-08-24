import { randomInt } from "crypto";
import { customAlphabet } from "nanoid";

const ADJECTIVES = [
  "Swift", "Golden", "Lucky", "Mighty", "Silent", "Cosmic", "Royal", "Blazing",
  "Crimson", "Silver", "Turbo", "Mystic", "Electric", "Shadow", "Radiant", "Wild",
];

const NOUNS = [
  "Tiger", "Falcon", "Dragon", "Wolf", "Phoenix", "Panther", "Cobra", "Eagle",
  "Rhino", "Shark", "Fox", "Lion", "Hawk", "Viper", "Bear", "Stallion",
];

const referralAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export function generateDisplayName(): string {
  const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const noun = NOUNS[randomInt(NOUNS.length)];
  const suffix = randomInt(1000, 9999);
  return `${adjective}${noun}${suffix}`;
}

export function generateAvatarSeed(): string {
  return randomInt(0, 1_000_000).toString(36);
}

export function generateReferralCode(): string {
  return referralAlphabet();
}
