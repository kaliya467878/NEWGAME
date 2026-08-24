import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { uploadImage } from "@/lib/storage/supabase";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("proof") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ message: "No screenshot file provided" }, { status: 400 });
    }

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];

    if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json({ message: "Invalid file type. Only JPEG, PNG, and WebP images are allowed." }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ message: "Invalid file extension." }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: "File is too large. Maximum size allowed is 5MB." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const screenshotUrl = await uploadImage(buffer, file.type, ext);

    return NextResponse.json({
      success: true,
      data: {
        proofPath: screenshotUrl,
      },
    });
  } catch (error: any) {
    console.error("POST wallet/deposit/proof API error:", error);
    return NextResponse.json({ message: error.message || "Failed to upload screenshot" }, { status: 500 });
  }
}
