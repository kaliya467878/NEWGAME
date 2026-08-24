"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/admin/permissions";
import { logActivity } from "@/lib/admin/activity";

// Generate alphanumeric secure access key (e.g., NOVA-ABCD-1234)
function generateKeyString(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `NOVA-${part()}-${part()}`;
}

// ---------------- Admin Actions ----------------

export async function createPredictorKeyAction(formData: FormData) {
  const staff = await assertPermission("staff.manage");
  const description = String(formData.get("description") || "Unnamed User");

  const newKey = await prisma.predictorKey.create({
    data: {
      key: generateKeyString(),
      description,
      isActive: true,
    }
  });

  await logActivity("PREDICTOR_KEY_CREATED", `Staff issued secure predictor key ${newKey.key} to ${description}`, staff.id, { keyId: newKey.id });
  revalidatePath("/admin/predictor-keys");
  return { success: true, key: newKey };
}

export async function togglePredictorKeyAction(formData: FormData) {
  const staff = await assertPermission("staff.manage");
  const id = String(formData.get("id"));

  const existing = await prisma.predictorKey.findUnique({ where: { id } });
  if (!existing) throw new Error("Key not found");

  const updated = await prisma.predictorKey.update({
    where: { id },
    data: { isActive: !existing.isActive }
  });

  const stateStr = updated.isActive ? "Activated" : "Suspended";
  await logActivity("PREDICTOR_KEY_TOGGLED", `Staff ${stateStr} predictor key ${updated.key}`, staff.id, { keyId: id });
  revalidatePath("/admin/predictor-keys");
  return { success: true };
}

export async function deletePredictorKeyAction(formData: FormData) {
  const staff = await assertPermission("staff.manage");
  const id = String(formData.get("id"));

  const deleted = await prisma.predictorKey.delete({ where: { id } });
  await logActivity("PREDICTOR_KEY_DELETED", `Staff deleted predictor key ${deleted.key}`, staff.id, { keyId: id });
  revalidatePath("/admin/predictor-keys");
  return { success: true };
}

export async function listPredictorKeys() {
  await assertPermission("staff.manage");
  return prisma.predictorKey.findMany({
    orderBy: { createdAt: "desc" }
  });
}

// ---------------- Public/User Actions ----------------

export async function validatePredictorKeyAction(key: string) {
  if (!key) return { error: "Access key is required" };

  const found = await prisma.predictorKey.findUnique({
    where: { key: key.trim().toUpperCase() }
  });

  if (!found) {
    return { error: "Invalid Access Key" };
  }
  if (!found.isActive) {
    return { error: "Access Key is suspended" };
  }

  return { success: true, key: found.key, description: found.description };
}

export async function getPredictionAction(number: string, key: string) {
  if (!number) return { error: "Period number is required" };
  if (!key) return { error: "Access key is required" };

  const found = await prisma.predictorKey.findUnique({
    where: { key: key.trim().toUpperCase() }
  });

  if (!found || !found.isActive) {
    return { error: "Unauthorized access key" };
  }

  const salt = 'omega_standalone_predictor_salt_982';
  const str = number.trim() + salt;
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  hash = Math.abs(hash);

  const predictedNumber = hash % 10;
  const size = predictedNumber <= 4 ? 'Small' : 'Big';
  
  let color;
  if (predictedNumber === 0) color = 'Red-Violet';
  else if (predictedNumber === 5) color = 'Green-Violet';
  else if ([1, 3, 7, 9].includes(predictedNumber)) color = 'Green';
  else color = 'Red';

  const confidence = 82 + (hash % 17); // 82% to 98%

  return {
    success: true,
    prediction: {
      number: predictedNumber,
      color,
      size,
      confidence
    }
  };
}
