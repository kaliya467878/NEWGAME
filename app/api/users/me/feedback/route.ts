import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { logActivity } from "@/lib/admin/activity";

export async function POST(req: NextRequest) {
  try {
    // Optionally authenticate the user (allows forgot password / support submissions when logged out)
    const user = await getAuthUser(req).catch(() => null);

    const body = await req.json().catch(() => ({}));

    const formTitle = body.formTitle || body.title || "User Support Request";
    const issueData = body.data || body || {};

    // Log this support issue to the Admin Activity Feed
    await logActivity(
      "SUPPORT_ISSUE",
      `[Self Service] User submitted issue: ${formTitle}`,
      user?.id || undefined,
      {
        userUid: user?.uid || "GUEST",
        phone: user?.phone || issueData.phoneOrEmail || "N/A",
        email: user?.email || "N/A",
        displayName: user?.displayName || "Guest User",
        submittedAt: new Date().toISOString(),
        ...issueData,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Submitted successfully.",
    });
  } catch (error: any) {
    console.error("Submit support issue API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
