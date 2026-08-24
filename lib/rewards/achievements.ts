export type AchievementStats = {
  betCount: number;
  referralCount: number;
  approvedDepositCount: number;
};

export type AchievementDef = {
  key: string;
  label: string;
  description: string;
  amount: number;
  isUnlocked: (stats: AchievementStats) => boolean;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "achievement:first_bet",
    label: "First Bet",
    description: "Place your first Wingo bet",
    amount: 20,
    isUnlocked: (s) => s.betCount >= 1,
  },
  {
    key: "achievement:ten_bets",
    label: "High Roller",
    description: "Place 10 Wingo bets",
    amount: 50,
    isUnlocked: (s) => s.betCount >= 10,
  },
  {
    key: "achievement:first_deposit",
    label: "First Deposit",
    description: "Get your first deposit approved",
    amount: 25,
    isUnlocked: (s) => s.approvedDepositCount >= 1,
  },
  {
    key: "achievement:first_referral",
    label: "Recruiter",
    description: "Refer your first friend",
    amount: 30,
    isUnlocked: (s) => s.referralCount >= 1,
  },
];
