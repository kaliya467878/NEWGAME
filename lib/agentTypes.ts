/** Client-safe constant — kept separate from lib/admin/agents.ts, which imports Prisma. */
export const AGENT_TYPE_LABELS: Record<string, string> = {
  MASTER_AGENT: "Master Agent",
  SUB_AGENT: "Sub Agent",
  REFERRAL_AGENT: "Referral Agent",
  DIRECT_AFFILIATE: "Direct Affiliate",
};
