import type { CmsType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getActiveCmsContent(type: CmsType) {
  const now = new Date();
  return prisma.cmsContent.findMany({
    where: {
      type,
      status: "PUBLISHED",
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getAllCmsContent() {
  return prisma.cmsContent.findMany({
    include: { createdBy: { select: { displayName: true } } },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getCmsContentById(id: string) {
  return prisma.cmsContent.findUnique({ where: { id } });
}

export async function getCmsVersions(contentId: string) {
  return prisma.cmsVersion.findMany({
    where: { contentId },
    include: { editedBy: { select: { displayName: true } } },
    orderBy: { version: "desc" },
  });
}
