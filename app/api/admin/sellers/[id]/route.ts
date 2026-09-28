import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { sellerProfiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/session-server";
import { logActivity } from "@/lib/activity";
import { redirectApp } from "@/lib/redirect";

const sellerSchema = z.object({ status: z.enum(["approved", "suspended", "rejected"]) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || current.session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const form = await request.formData();
  const payload = sellerSchema.parse({ status: form.get("status") });

  const db = getDb();
  await db.update(sellerProfiles).set({ status: payload.status, updatedAt: new Date() }).where(eq(sellerProfiles.id, id));
  await logActivity({ actorId: current.user.id, action: "seller.moderated", entityType: "seller_profile", entityId: id, metadata: { status: payload.status } });

  return redirectApp("/admin/sellers", request);
}
