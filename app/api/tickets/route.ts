import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { createTicket, getSellerIdForOrder } from "@/lib/tickets";
import { getCurrentUser } from "@/lib/session-server";
import { logActivity } from "@/lib/activity";
import { sendNotificationEmail } from "@/lib/email";
import { redirectApp } from "@/lib/redirect";

const ticketSchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().max(2000).optional(),
  orderId: z.string().optional()
});

export async function POST(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current) {
    return redirectApp("/login", request);
  }

  const form = await request.formData();
  const payload = ticketSchema.parse({
    subject: form.get("subject"),
    message: form.get("message") || undefined,
    orderId: form.get("orderId") || undefined
  });

  const db = getDb();
  let sellerId: string | null = null;

  if (payload.orderId) {
    const [order] = await db.select().from(orders).where(eq(orders.id, payload.orderId)).limit(1);
    if (!order || order.buyerId !== current.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    sellerId = await getSellerIdForOrder(payload.orderId);
  }

  const ticket = await createTicket({
    buyerId: current.user.id,
    subject: payload.subject,
    message: payload.message,
    orderId: payload.orderId ?? null,
    sellerId
  });

  await sendNotificationEmail({
    to: process.env.SUPPORT_EMAIL,
    subject: `Ticket baru: ${payload.subject}`,
    text: `Ticket baru dibuat oleh ${current.user.name} (${current.user.email}). Ticket ID: ${ticket?.id ?? "unknown"}.`
  });

  await logActivity({
    actorId: current.user.id,
    action: "ticket.created",
    entityType: "ticket",
    entityId: payload.orderId ?? String(current.user.id),
    metadata: { subject: payload.subject, hasMessage: Boolean(payload.message), orderId: payload.orderId ?? null, sellerId }
  });

  return redirectApp("/dashboard/tickets", request);
}
