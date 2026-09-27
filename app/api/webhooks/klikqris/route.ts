import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { orders, paymentEvents, payments } from "@/db/schema";
import { fulfillAutoDelivery, getOrderNotificationRecipient } from "@/lib/orders";
import { logActivity } from "@/lib/activity";
import { sendNotificationEmail } from "@/lib/email";

const webhookSchema = z.object({
  order_id: z.string().optional(),
  merchant_ref: z.string().optional(),
  invoice_id: z.string().optional(),
  amount: z.coerce.number().optional(),
  total_amount: z.coerce.number().optional(),
  status: z.string(),
  signature: z.string().optional(),
  paid_at: z.string().optional()
});

type PaidWebhookResult =
  | { kind: "paid"; order: { id: string; orderNumber: string; buyerId: number; totalAmount: string } }
  | { kind: "duplicate" }
  | { kind: "error"; message: string; status: number };

async function notifyTelegram(chatId: number, message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (e) {
    console.error("Failed to send Telegram message:", e);
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let bodyJson: any = {};
  try {
    bodyJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = webhookSchema.safeParse(bodyJson);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid schema", details: parseResult.error }, { status: 400 });
  }

  const body = parseResult.data;
  const orderNumber = body.order_id || body.merchant_ref || body.invoice_id;
  if (!orderNumber) {
    return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
  }

  const rawStatus = (body.status || "").toUpperCase();
  const isPaid = ["PAID", "SUCCESS", "SETTLEMENT", "COMPLETED"].includes(rawStatus);

  if (!isPaid) {
    return NextResponse.json({ ok: true, message: `Status ${rawStatus} ignored` });
  }

  const db = getDb();
  const result: PaidWebhookResult = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${orderNumber}))`);

    const [order] = await tx.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
    if (!order) {
      // Check transactions table directly if created by bot
      const trxRows = await tx.execute(sql`SELECT * FROM transactions WHERE id = ${orderNumber} LIMIT 1`);
      const trx = trxRows[0] as any;
      if (trx) {
        await tx.execute(sql`UPDATE transactions SET status = 'PAID', paid_at = NOW() WHERE id = ${orderNumber}`);
        return { kind: "paid", order: { id: orderNumber, orderNumber, buyerId: Number(trx.user_id), totalAmount: String(trx.amount) } };
      }
      return { kind: "error", message: "Order not found", status: 404 };
    }

    if (order.status === "paid" || order.status === "delivered") {
      return { kind: "duplicate" };
    }

    await tx.insert(paymentEvents).values({
      transactionId: order.id,
      provider: "klikqris",
      eventType: rawStatus,
      payload: bodyJson
    });

    await tx
      .update(payments)
      .set({
        status: "paid",
        paidAt: new Date(),
        rawPayload: bodyJson,
        updatedAt: new Date()
      })
      .where(eq(payments.orderId, order.id));

    await tx
      .update(orders)
      .set({
        status: "paid",
        paidAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(orders.id, order.id));

    // Update transactions table in aeternum_premiapp_db
    await tx.execute(sql`
      UPDATE transactions 
      SET status = 'PAID', paid_at = NOW() 
      WHERE id = ${orderNumber} OR gateway_reference = ${orderNumber};
    `);

    return {
      kind: "paid",
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        buyerId: order.buyerId,
        totalAmount: String(order.totalAmount)
      }
    };
  });

  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  if (result.kind === "duplicate") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Fulfill digital product stock automatically
  const deliveryState = await fulfillAutoDelivery(result.order.id);
  const recipient = await getOrderNotificationRecipient(result.order.id);

  // Send Email Notification
  if (recipient?.email) {
    await sendNotificationEmail({
      to: recipient.email,
      subject: `Pembayaran Invoice #${result.order.orderNumber} Berhasil - Aeternum Shop`,
      text:
        deliveryState === "delivered"
          ? `Pembayaran untuk invoice #${result.order.orderNumber} berhasil dikonfirmasi. Akses dan kredensial produk Anda telah tersedia di dashboard.`
          : `Pembayaran untuk invoice #${result.order.orderNumber} berhasil. Pesanan Anda sedang diproses oleh sistem.`
    });
  }

  // Send Telegram Notifications (to Buyer and Admin)
  const adminId = Number(process.env.ADMIN_ID || "606533609");
  const formattedAmount = `Rp ${Number(result.order.totalAmount).toLocaleString("id-ID")}`;

  const adminMsg = 
    `💰 <b>NOTIFIKASI PEMBELIAN WEB SHOP (KLIKQRIS)!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 <b>Invoice:</b> <code>#${result.order.orderNumber}</code>\n` +
    `💵 <b>Total:</b> <code>${formattedAmount}</code>\n` +
    `👤 <b>Buyer ID:</b> <code>${result.order.buyerId}</code>\n` +
    `✅ <b>Delivery:</b> ${deliveryState === "delivered" ? "Terkirim Otomatis" : "Processing"}\n` +
    `━━━━━━━━━━━━━━━━━━━━━`;
  await notifyTelegram(adminId, adminMsg);

  if (result.order.buyerId && result.order.buyerId > 1000) {
    const buyerMsg =
      `🎉 <b>PEMBAYARAN WEB SHOP BERHASIL!</b>\n\n` +
      `🧾 <b>No. Invoice:</b> <code>#${result.order.orderNumber}</code>\n` +
      `💵 <b>Total:</b> <code>${formattedAmount}</code>\n\n` +
      `Terima kasih! Pesanan Anda telah diverifikasi oleh sistem Aeternum.`;
    await notifyTelegram(result.order.buyerId, buyerMsg);
  }

  await logActivity({
    actorId: result.order.buyerId,
    action: "payment.paid_klikqris",
    entityType: "order",
    entityId: result.order.id,
    metadata: {
      orderNumber: result.order.orderNumber,
      amount: result.order.totalAmount,
      deliveryState
    }
  });

  return NextResponse.json({ ok: true, status: "PAID", orderNumber: result.order.orderNumber });
}
