import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { orders, payments } from "@/db/schema";
import { checkKlikQrisStatus } from "@/lib/klikqris";
import { fulfillAutoDelivery } from "@/lib/orders";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, id)).limit(1);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status === "paid" || order.status === "delivered") {
    return NextResponse.json({ paid: true, status: order.status });
  }

  // Check live with KlikQRIS API
  const statusRes = await checkKlikQrisStatus(id);
  const rawStatus = (statusRes?.data?.status || "").toUpperCase();

  if (["PAID", "SUCCESS", "SETTLEMENT", "COMPLETED"].includes(rawStatus)) {
    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
        .where(eq(orders.id, order.id));

      await tx
        .update(payments)
        .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
        .where(eq(payments.orderId, order.id));

      await tx.execute(sql`
        UPDATE transactions 
        SET status = 'PAID', paid_at = NOW() 
        WHERE id = ${id} OR gateway_reference = ${id};
      `);
    });

    await fulfillAutoDelivery(order.id);
    return NextResponse.json({ paid: true, status: "paid" });
  }

  return NextResponse.json({ paid: false, status: order.status });
}
