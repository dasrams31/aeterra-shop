import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/session-server";
import { logActivity } from "@/lib/activity";
import { sendNotificationEmail } from "@/lib/email";

const resellerSchema = z.object({ status: z.enum(["approved", "rejected"]) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || current.session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const idNum = Number(id);
  const form = await request.formData();
  const payload = resellerSchema.parse({ status: form.get("status") });

  const db = getDb();
  await db.update(users).set({ resellerStatus: payload.status, isReseller: payload.status === "approved", updatedAt: new Date() }).where(eq(users.id, idNum));
  const [user] = await db.select().from(users).where(eq(users.id, idNum)).limit(1);
  await sendNotificationEmail({
    to: user?.email,
    subject: `Status reseller ${payload.status}`,
    text: payload.status === "approved"
      ? "Pengajuan reseller kamu disetujui. Harga reseller akan muncul pada produk yang mendukung."
      : "Pengajuan reseller kamu belum disetujui. Kamu tetap bisa belanja sebagai buyer biasa."
  });
  await logActivity({ actorId: current.user.id, action: "reseller.moderated", entityType: "user", entityId: id, metadata: { status: payload.status } });

  return NextResponse.redirect(new URL("/admin/users", request.url), { status: 303 });
}
