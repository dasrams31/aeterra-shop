import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { activityLogs, users } from "@/db/schema";

export async function getReferralStatsForCode(code: string, limit = 5) {
  const db = getDb();
  const referralCode = code.trim().toUpperCase();

  const [summary] = await db
    .select({ count: sql<number>`count(*)` })
    .from(activityLogs)
    .innerJoin(users, eq(activityLogs.actorId, users.id))
    .where(and(eq(activityLogs.action, "auth.register"), eq(sql<string>`(${activityLogs.metadata} ->> 'referralCode')`, referralCode)));

  const rows = await db
    .select({
      actorName: users.name,
      actorEmail: users.email,
      createdAt: activityLogs.createdAt
    })
    .from(activityLogs)
    .innerJoin(users, eq(activityLogs.actorId, users.id))
    .where(and(eq(activityLogs.action, "auth.register"), eq(sql<string>`(${activityLogs.metadata} ->> 'referralCode')`, referralCode)))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  const [orders] = await db
    .select({ count: sql<number>`count(*)`, revenue: sql<number>`coalesce(sum((metadata ->> 'amount')::int), 0)` })
    .from(activityLogs)
    .where(and(eq(activityLogs.action, "order.created"), eq(sql<string>`(${activityLogs.metadata} ->> 'referralCode')`, referralCode)));

  return { count: Number(summary?.count ?? 0), orderCount: Number(orders?.count ?? 0), revenue: Number(orders?.revenue ?? 0), rows };
}

export async function getReferralCodeForUserSignup(userId: number | string) {
  const db = getDb();
  const [activity] = await db
    .select({ referralCode: sql<string | null>`${activityLogs.metadata} ->> 'referralCode'` })
    .from(activityLogs)
    .where(and(eq(activityLogs.action, "auth.register"), eq(activityLogs.actorId, Number(userId))))
    .orderBy(desc(activityLogs.createdAt))
    .limit(1);

  return activity?.referralCode?.trim().toUpperCase() || null;
}
