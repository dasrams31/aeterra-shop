import { NextRequest, NextResponse } from "next/server";

export function getAppBaseUrl(request?: Request | NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    if (forwardedHost && !forwardedHost.includes("localhost") && !forwardedHost.includes("127.0.0.1")) {
      return `${proto}://${forwardedHost}`;
    }
  }

  return "https://shop.dasrams.biz.id";
}

export function redirectApp(path: string, request?: Request | NextRequest, status = 303): NextResponse {
  const base = getAppBaseUrl(request);
  const targetUrl = new URL(path.startsWith("/") ? path : `/${path}`, base);
  return NextResponse.redirect(targetUrl, { status });
}
