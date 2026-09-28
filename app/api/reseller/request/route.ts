import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/session-server";
import { logActivity } from "@/lib/activity";
import { redirectApp } from "@/lib/redirect";

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return redirectApp("/login", request);

  const db = getDb();
  await db.update(users).set({ resellerStatus: "pending", updatedAt: new Date() }).where(eq(users.id, current.user.id));
  await logActivity({ actorId: current.user.id, action: "reseller.requested", entityType: "user", entityId: String(current.user.id) });

  return redirectApp("/dashboard/reseller", request);
}
