import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { orderItems, orders, reviews } from "@/db/schema";
import { getCurrentUser } from "@/lib/session-server";
import { createReview } from "@/lib/reviews";
import { logActivity } from "@/lib/activity";

const reviewSchema = z.object({
  orderItemId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional()
});

export async function POST(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const form = await request.formData();
  const payload = reviewSchema.parse({
    orderItemId: form.get("orderItemId"),
    rating: form.get("rating"),
    comment: form.get("comment") || undefined
  });

  const db = getDb();
  const [item] = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      deliveryStatus: orderItems.deliveryStatus
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(orderItems.id, payload.orderItemId))
    .limit(1);

  if (!item || item.deliveryStatus !== "delivered") {
    return NextResponse.json({ error: "Item belum bisa direview" }, { status: 400 });
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, item.orderId)).limit(1);
  if (!order || order.buyerId !== current.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [existing] = await db.select().from(reviews).where(eq(reviews.orderItemId, item.id)).limit(1);
  if (existing) {
    return NextResponse.redirect(new URL(`/dashboard/orders/${order.orderNumber}`, request.url), { status: 303 });
  }

  await createReview({
    productId: item.productId,
    orderItemId: item.id,
    buyerId: current.user.id,
    rating: payload.rating,
    comment: payload.comment ?? null
  });

  await logActivity({
    actorId: current.user.id,
    action: "review.created",
    entityType: "review",
    entityId: String(item.id),
    metadata: { productId: item.productId, rating: payload.rating }
  });

  return NextResponse.redirect(new URL(`/dashboard/orders/${order.orderNumber}`, request.url), { status: 303 });
}
