import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Retrieve the custom admin panel path from environment variables
  const adminPathEnv = process.env.ADMIN_PANEL_PATH || "/admin";
  const customAdminPath = adminPathEnv.startsWith("/") ? adminPathEnv : `/${adminPathEnv}`;

  // 1. Return 404 in production for direct requests to `/admin` if a custom path is configured
  if (process.env.NODE_ENV === "production" && customAdminPath !== "/admin") {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      // Rewrite to a non-existent path to trigger standard Next.js 404
      const url = request.nextUrl.clone();
      url.pathname = "/404";
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
  }

  // 2. Rewrite custom admin path requests to the physical `/admin` routing filesystem
  if (customAdminPath !== "/admin") {
    if (pathname === customAdminPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    if (pathname.startsWith(customAdminPath + "/")) {
      const remainingPath = pathname.substring(customAdminPath.length);
      const url = request.nextUrl.clone();
      url.pathname = `/admin${remainingPath}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

// Limit the middleware matcher to match relevant paths to keep static resources fast
export const config = {
  matcher: [
    "/admin/:path*",
    // Dynamically match any custom path matching layout prefixes
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
