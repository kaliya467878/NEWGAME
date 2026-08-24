"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { CmsContent, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { assertPermission } from "@/lib/admin/permissions";
import { logActivity } from "@/lib/admin/activity";
import type { AdminActionState } from "@/lib/actions/admin";
import { uploadImage } from "@/lib/storage/supabase";

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type UploadImageResult = { error: string } | { url: string };

export async function uploadCmsImageAction(formData: FormData): Promise<UploadImageResult> {
  const staff = await assertPermission("cms.manage");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file selected" };

  const extension = IMAGE_TYPES[file.type];
  if (!extension) return { error: "Only JPG, PNG, WebP or GIF images are allowed" };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Image must be 4MB or smaller" };

  try {
    const url = await uploadImage(await file.arrayBuffer(), file.type, extension);
    await logAudit(staff.id, "CMS_IMAGE_UPLOADED", "CmsContent", undefined, { url, bytes: file.size });
    return { url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }
}

async function logAudit(actorId: string, action: string, targetType: string, targetId?: string, meta?: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: { actorId, action, targetType, targetId, meta: meta as Prisma.InputJsonValue | undefined },
  });
}

async function snapshotVersion(content: CmsContent, editedById: string) {
  await prisma.cmsVersion.create({
    data: {
      contentId: content.id,
      version: content.version,
      status: content.status,
      editedById,
      snapshot: {
        type: content.type,
        title: content.title,
        body: content.body,
        imageUrl: content.imageUrl,
        linkUrl: content.linkUrl,
        sortOrder: content.sortOrder,
        startAt: content.startAt?.toISOString() ?? null,
        endAt: content.endAt?.toISOString() ?? null,
      },
    },
  });
}

const optionalString = z.string().trim().optional().or(z.literal("")).transform((v) => (v ? v : undefined));

const cmsFieldsSchema = z.object({
  type: z.enum(["HOMEPAGE_BANNER", "POPUP", "ANNOUNCEMENT", "PROMOTIONAL_CARD"]),
  title: z.string().trim().min(1, "Title is required"),
  body: optionalString,
  imageUrl: optionalString,
  linkUrl: optionalString,
  badge: optionalString,
  highlight: optionalString,
  emoji: optionalString,
  sortOrder: z.coerce.number().int().default(0),
  startAt: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? new Date(v) : undefined)),
  endAt: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? new Date(v) : undefined)),
});

function readCmsFields(formData: FormData) {
  return cmsFieldsSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    body: formData.get("body"),
    imageUrl: formData.get("imageUrl"),
    linkUrl: formData.get("linkUrl"),
    badge: formData.get("badge"),
    highlight: formData.get("highlight"),
    emoji: formData.get("emoji"),
    sortOrder: formData.get("sortOrder") || 0,
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
  });
}

export async function createCmsContentAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("cms.manage");
  const parsed = readCmsFields(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const content = await prisma.cmsContent.create({
    data: { ...parsed.data, createdById: staff.id },
  });
  await snapshotVersion(content, staff.id);
  await logAudit(staff.id, "CMS_CREATED", "CmsContent", content.id, { type: content.type, title: content.title });

  revalidatePath("/admin/cms");
  return { success: "Content created as a draft." };
}

export async function updateCmsContentAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("cms.manage");
  const id = String(formData.get("id"));
  const parsed = readCmsFields(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const content = await prisma.cmsContent.update({
    where: { id },
    data: { ...parsed.data, version: { increment: 1 } },
  });
  await snapshotVersion(content, staff.id);
  await logAudit(staff.id, "CMS_UPDATED", "CmsContent", content.id);

  revalidatePath("/admin/cms");
  revalidatePath(`/admin/cms/${id}`);
  return { success: "Content updated." };
}

export async function publishCmsContentAction(formData: FormData) {
  const staff = await assertPermission("cms.publish");
  const id = String(formData.get("id"));

  const content = await prisma.cmsContent.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date(), version: { increment: 1 } },
  });
  await snapshotVersion(content, staff.id);
  await logAudit(staff.id, "CMS_PUBLISHED", "CmsContent", content.id, { type: content.type });
  await logActivity("CMS_PUBLISHED", `Published ${content.type}: "${content.title}"`, staff.id, { cmsContentId: content.id });

  if (content.type === "ANNOUNCEMENT") {
    const recipients = await prisma.user.findMany({ where: { role: "USER" }, select: { id: true } });
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.id,
        type: "ANNOUNCEMENT" as const,
        title: content.title,
        body: content.body ?? "",
        meta: { cmsContentId: content.id },
      })),
    });
  }

  revalidatePath("/admin/cms");
  revalidatePath("/admin/promo-banners");
  revalidatePath("/dashboard");
}

export async function archiveCmsContentAction(formData: FormData) {
  const staff = await assertPermission("cms.publish");
  const id = String(formData.get("id"));

  const content = await prisma.cmsContent.update({
    where: { id },
    data: { status: "ARCHIVED", version: { increment: 1 } },
  });
  await snapshotVersion(content, staff.id);
  await logAudit(staff.id, "CMS_ARCHIVED", "CmsContent", content.id);

  revalidatePath("/admin/cms");
  revalidatePath("/admin/promo-banners");
  revalidatePath("/dashboard");
}

/** Quick on/off toggle for a slide — published <-> archived — used by the promo banner editor's "Show on home". */
export async function toggleCmsVisibilityAction(formData: FormData) {
  const staff = await assertPermission("cms.publish");
  const id = String(formData.get("id"));
  const makeVisible = formData.get("visible") === "true";

  const existing = await prisma.cmsContent.findUniqueOrThrow({ where: { id } });
  const content = await prisma.cmsContent.update({
    where: { id },
    data: {
      status: makeVisible ? "PUBLISHED" : "ARCHIVED",
      publishedAt: makeVisible ? new Date() : existing.publishedAt,
      version: { increment: 1 },
    },
  });
  await snapshotVersion(content, staff.id);
  await logAudit(staff.id, makeVisible ? "CMS_PUBLISHED" : "CMS_ARCHIVED", "CmsContent", content.id);

  revalidatePath("/admin/promo-banners");
  revalidatePath("/admin/cms");
  revalidatePath("/dashboard");
}

export async function deleteCmsContentAction(formData: FormData) {
  const staff = await assertPermission("cms.manage");
  const id = String(formData.get("id"));
  const content = await prisma.$transaction(async (tx) => {
    await tx.cmsVersion.deleteMany({ where: { contentId: id } });
    return tx.cmsContent.delete({ where: { id } });
  });
  await logAudit(staff.id, "CMS_DELETED", "CmsContent", id, { title: content.title, type: content.type });

  revalidatePath("/admin/promo-banners");
  revalidatePath("/admin/cms");
  revalidatePath("/dashboard");
}

/** Creates a new draft slide of the given type with sensible blank defaults — used by "+ Add slide". */
export async function addBlankSlideAction(formData: FormData) {
  const staff = await assertPermission("cms.manage");
  const type = String(formData.get("type")) as "HOMEPAGE_BANNER" | "PROMOTIONAL_CARD";

  const maxSort = await prisma.cmsContent.aggregate({ where: { type }, _max: { sortOrder: true } });

  const content = await prisma.cmsContent.create({
    data: {
      type,
      title: "NEW SLIDE",
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      createdById: staff.id,
    },
  });
  await snapshotVersion(content, staff.id);
  await logAudit(staff.id, "CMS_CREATED", "CmsContent", content.id, { type });

  revalidatePath("/admin/promo-banners");
}
