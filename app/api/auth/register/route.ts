import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSessionToken, hashPassword, getSessionCookieName } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { sendNotificationEmail } from "@/lib/email";
import { redirectApp } from "@/lib/redirect";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  referralCode: z.string().min(4).max(32).optional()
});

export async function POST(request: Request) {
  const form = await request.formData();
  const payload = registerSchema.parse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
    referralCode: form.get("referralCode") || undefined
  });

  const db = getDb();
  const passwordHash = hashPassword(payload.password);
  const userId = Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);
  const [user] = await db
    .insert(users)
    .values({ id: userId, name: payload.name, email: payload.email.toLowerCase(), passwordHash })
    .returning();

  const targetPath = user.role === "seller" ? "/seller" : user.role === "admin" ? "/admin" : "/dashboard";
  const response = redirectApp(targetPath, request);
  response.cookies.set(getSessionCookieName(), createSessionToken({ userId: user.id, role: user.role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  await logActivity({ actorId: user.id, action: "auth.register", entityType: "user", entityId: String(user.id), metadata: { email: user.email, role: user.role, referralCode: payload.referralCode ?? null } });
  if (user.email) {
    await sendNotificationEmail({
      to: user.email,
      subject: "Akun Aeternum Shop berhasil dibuat",
      text: `Halo ${user.name}, akun Aeternum Shop kamu sudah aktif. Kamu bisa checkout produk digital dan pantau pesanan dari dashboard.`
    });
  }
  return response;
}
