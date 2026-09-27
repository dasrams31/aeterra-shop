import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionCookieName, createSessionToken, verifyPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { findUserByEmail } from "@/lib/users";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

function dashboardPath(role: "buyer" | "seller" | "admin") {
  if (role === "admin") return "/admin";
  if (role === "seller") return "/seller";
  return "/dashboard";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const payload = loginSchema.parse({
    email: form.get("email"),
    password: form.get("password")
  });

  const user = await findUserByEmail(payload.email.toLowerCase());
  if (!user || !user.passwordHash || !verifyPassword(payload.password, user.passwordHash)) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url));
  }

  const response = NextResponse.redirect(new URL(dashboardPath(user.role), request.url));
  response.cookies.set(getSessionCookieName(), createSessionToken({ userId: user.id, role: user.role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  await logActivity({ actorId: user.id, action: "auth.login", entityType: "user", entityId: String(user.id), metadata: { email: user.email, role: user.role } });
  return response;
}
