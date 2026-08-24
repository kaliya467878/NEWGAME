import { prisma } from "@/lib/prisma";

export { AGENT_TYPE_LABELS } from "@/lib/agentTypes";

export async function getAgentStats() {
  const [total, master, sub, referral, affiliate] = await Promise.all([
    prisma.agent.count({ where: { status: "ACTIVE" } }),
    prisma.agent.count({ where: { type: "MASTER_AGENT", status: "ACTIVE" } }),
    prisma.agent.count({ where: { type: "SUB_AGENT", status: "ACTIVE" } }),
    prisma.agent.count({ where: { type: "REFERRAL_AGENT", status: "ACTIVE" } }),
    prisma.agent.count({ where: { type: "DIRECT_AFFILIATE", status: "ACTIVE" } }),
  ]);
  return { total, master, sub, referral, affiliate };
}

export async function searchAgents(opts: { q?: string; type?: string; status?: string; take?: number }) {
  const { q, type, status, take = 100 } = opts;
  return prisma.agent.findMany({
    where: {
      ...(q ? { OR: [{ inviteCode: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }, { mobile: { contains: q } }] } : {}),
      ...(type ? { type: type as never } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: {
      parent: { select: { name: true, inviteCode: true } },
      _count: { select: { children: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}
