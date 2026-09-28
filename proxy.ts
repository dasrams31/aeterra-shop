import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName, verifyEdgeSessionToken } from "@/lib/edge-auth";
import { getAppBaseUrl } from "@/lib/redirect";

const protectedPrefixes = ["/dashboard", "/seller", "/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedRoute = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (!protectedRoute) return NextResponse.next();

  const token = request.cookies.get(getSessionCookieName())?.value;
  const session = await verifyEdgeSessionToken(token);

  if (!session) {
    const baseUrl = getAppBaseUrl(request);
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/seller/:path*", "/admin/:path*"]
};
