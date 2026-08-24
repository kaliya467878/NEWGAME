import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return new NextResponse("Not authorized", { status: 401 });
    }

    const { id } = await params;

    const deposit = await prisma.depositRequest.findUnique({
      where: { id },
    });

    if (!deposit) {
      return new NextResponse("Deposit not found", { status: 404 });
    }

    if (deposit.userId !== user.id && user.role !== "STAFF" && user.role !== "SUPER_ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Parse the note to extract the screenshotUrl
    let noteDetails: any = {};
    try {
      noteDetails = JSON.parse(deposit.note || "{}");
    } catch {}

    const screenshotUrl = noteDetails.screenshotUrl;
    if (!screenshotUrl) {
      return new NextResponse("Proof image not found", { status: 404 });
    }

    // Fetch the image from Supabase Storage and stream it back
    const response = await fetch(screenshotUrl);
    if (!response.ok) {
      return new NextResponse("Could not fetch proof image from storage", { status: 502 });
    }

    const contentType = response.headers.get("Content-Type") || "image/png";
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error: any) {
    console.error("GET wallet/deposits/[id]/proof API error:", error);
    return new NextResponse(error.message || "Internal server error", { status: 500 });
  }
}
