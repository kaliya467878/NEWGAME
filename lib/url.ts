import { NextRequest } from "next/server";

/**
 * Resolves the correct public base URL of the application, taking into account
 * reverse proxies (like Nginx, Render, Cloudflare, Vercel) and local development overrides.
 */
export function getRequestBaseUrl(request: NextRequest): string {
  // 1. Check environment variables first (explicit override)
  const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  // 2. Check forwarded headers from reverse proxies
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
  }

  // 3. Check standard Host header
  const host = request.headers.get("host");
  if (host) {
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    const protocol = isLocal ? "http" : "https";
    return `${protocol}://${host}`.replace(/\/$/, "");
  }

  // 4. Ultimate fallback
  return "https://11luckynova.vercel.app";
}

/**
 * Resolves the correct base URL inside Server Actions / server contexts using next/headers.
 */
export function getServerActionBaseUrl(headersList: Headers): string {
  const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const forwardedHost = headersList.get("x-forwarded-host");
  const forwardedProto = headersList.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
  }

  const host = headersList.get("host") || "localhost:3000";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const protocol = isLocal ? "http" : "https";
  return `${protocol}://${host}`.replace(/\/$/, "");
}
