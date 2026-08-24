import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/admin/permissions";
import { getActivityFeed } from "@/lib/admin/queries";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, "activity.view"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const feed = await getActivityFeed(50);
  return NextResponse.json({ feed });
}
