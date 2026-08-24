import { prisma } from "@/lib/prisma";

export type BonusSettings = {
  signupBonus: number;
  dailyReward: number;
  referralReward: number;
  depositBonusPercent: number;
  achievements: Record<string, number>;
};

export const DEFAULT_BONUS_SETTINGS: BonusSettings = {
  signupBonus: 100,
  dailyReward: 10,
  referralReward: 20,
  depositBonusPercent: 0,
  achievements: {
    "achievement:first_bet": 20,
    "achievement:ten_bets": 50,
    "achievement:first_deposit": 25,
    "achievement:first_referral": 30,
  },
};

const SETTING_KEY = "bonusSettings";

let cached: { value: BonusSettings; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getBonusSettings(): Promise<BonusSettings> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  let value = DEFAULT_BONUS_SETTINGS;
  if (row) {
    try {
      const parsed = JSON.parse(row.value) as Partial<BonusSettings>;
      value = {
        ...DEFAULT_BONUS_SETTINGS,
        ...parsed,
        achievements: { ...DEFAULT_BONUS_SETTINGS.achievements, ...parsed.achievements },
      };
    } catch {
      value = DEFAULT_BONUS_SETTINGS;
    }
  }

  cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function saveBonusSettings(next: BonusSettings): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: SETTING_KEY, value: JSON.stringify(next) },
  });
  cached = { value: next, expiresAt: Date.now() + CACHE_TTL_MS };
}

export function getFirstDepositBonus(amountInInr: number, noteStr: string | null): number {
  let noteDetails: any = {};
  try {
    noteDetails = JSON.parse(noteStr || "{}");
  } catch {}

  const isUsdt = (noteDetails.payCurrency || noteDetails.manualChannelLabel || "").toLowerCase().includes("usdt") ||
                 (noteDetails.payCurrency || noteDetails.manualChannelLabel || "").toLowerCase().includes("trc20") ||
                 (noteDetails.payCurrency || noteDetails.manualChannelLabel || "").toLowerCase().includes("bep20");

  if (isUsdt) {
    const usdAmount = Number(noteDetails.actuallyPaidUsdt || noteDetails.payAmount || (amountInInr / 97));
    let usdBonus = 0;
    if (usdAmount >= 100) {
      usdBonus = 20;
    } else if (usdAmount >= 50) {
      usdBonus = 5;
    } else if (usdAmount >= 20) {
      usdBonus = 3;
    } else if (usdAmount >= 10) {
      usdBonus = 2;
    } else if (usdAmount >= 5) {
      usdBonus = 1;
    }
    const rate = usdAmount > 0 ? (amountInInr / usdAmount) : 98;
    return Math.round(usdBonus * rate);
  } else {
    // INR Slabs
    if (amountInInr >= 10000) {
      return 1960;
    } else if (amountInInr >= 5000) {
      return 490;
    } else if (amountInInr >= 2000) {
      return 294;
    } else if (amountInInr >= 1000) {
      return 196;
    } else if (amountInInr >= 500) {
      return 98;
    }
    return 0;
  }
}
