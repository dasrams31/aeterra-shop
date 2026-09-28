import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { ticketMessages, tickets } from "@/db/schema";
import { getCurrentUser } from "@/lib/session-server";
import { getTicketDetail } from "@/lib/tickets";
import { sendNotificationEmail } from "@/lib/email";
import { eq } from "drizzle-orm";
import { redirectApp } from "@/lib/redirect";

const replySchema = z.object({
  message: z.string().min(1).max(2000)
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) {
    return redirectApp("/login", request);
  }

  const { id } = await params;
  const idNum = Number(id);
  const detail = await getTicketDetail(idNum);
  if (!detail) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const isBuyer = detail.ticket.buyerId === current.user.id;
  const isAdmin = current.session.role === "admin";
  const isSeller = current.session.role === "seller" && detail.ticket.sellerId;

  if (!isBuyer && !isAdmin && !isSeller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const payload = replySchema.parse({ message: form.get("message") });

  const db = getDb();
  await db.insert(ticketMessages).values({
    ticketId: idNum,
    senderId: current.user.id,
    message: payload.message
  });

  await db.update(tickets).set({ status: "pending", updatedAt: new Date() }).where(eq(tickets.id, idNum));

  await sendNotificationEmail({
    to: process.env.SUPPORT_EMAIL,
    subject: `Balasan ticket #${id}: ${detail.ticket.subject}`,
    text: `${current.user.name} membalas ticket: ${payload.message}`
  });

  const prefix = isAdmin ? "/admin" : isSeller ? "/seller" : "/dashboard";
  return redirectApp(`${prefix}/tickets/${id}`, request);
}
