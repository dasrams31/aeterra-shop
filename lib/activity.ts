import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { activityLogs, users } from "@/db/schema";

export async function logActivity(input: {
  actorId?: number | string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();

  try {
    await db.insert(activityLogs).values({
      actorId: input.actorId ? Number(input.actorId) : null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {}
    });
  } catch {
    // best-effort audit log
  }
}

export async function listRecentActivity(limit = 10) {
  const db = getDb();

  return db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
      actorName: users.name,
      actorRole: users.role
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.actorId, users.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}

export async function listWithdrawalRequests() {
  const db = getDb();

  return db
    .select({
      id: activityLogs.id,
      actorId: activityLogs.actorId,
      actorName: users.name,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.actorId, users.id))
    .where(eq(activityLogs.action, "seller.withdrawal_requested"))
    .orderBy(desc(activityLogs.createdAt));
}
