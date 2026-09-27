import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { orderItems, orders, productStocks, products, payments, users } from "@/db/schema";

export function createOrderNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SHOP-${ts}-${rand}`;
}

export async function getOrderByNumber(orderNumber: string) {
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  return order ?? null;
}

export async function getPublicInvoiceStatus(orderNumber: string) {
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber.trim())).limit(1);
  if (!order) return null;

  const items = await db
    .select({ productName: products.name, deliveryStatus: orderItems.deliveryStatus })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, order.id));
  const [payment] = await db.select({ status: payments.status }).from(payments).where(eq(payments.orderId, order.id)).limit(1);

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    deliveredAt: order.deliveredAt,
    paymentStatus: payment?.status ?? "pending",
    items
  };
}

export async function getOrderDetailByNumber(orderNumber: string) {
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) return null;

  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productName: products.name,
      productSlug: products.slug,
      sellerId: orderItems.sellerId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      fulfillmentType: orderItems.fulfillmentType,
      deliveryContent: orderItems.deliveryContent,
      deliveryStatus: orderItems.deliveryStatus,
      createdAt: orderItems.createdAt,
      deliveredAt: orderItems.deliveredAt
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.createdAt));
  const payment = await db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1);

  return {
    order,
    items,
    payment: payment[0] ?? null
  };
}

export async function listOrdersByBuyerId(buyerId: number) {
  const db = getDb();
  return db.select().from(orders).where(eq(orders.buyerId, buyerId)).orderBy(desc(orders.createdAt));
}

export async function countSoldOrderItems() {
  const db = getDb();
  const rows = await db
    .select({ quantity: orderItems.quantity })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(or(eq(orders.status, "paid"), eq(orders.status, "processing"), eq(orders.status, "delivered"))!);

  return rows.reduce((sum, row) => sum + row.quantity, 0);
}

export async function listPaymentsByBuyerId(buyerId: number) {
  const db = getDb();
  return db
    .select({
      id: payments.id,
      status: payments.status,
      amount: payments.amount,
      providerReference: payments.providerReference,
      paymentUrl: payments.paymentUrl,
      createdAt: payments.createdAt,
      paidAt: payments.paidAt,
      orderNumber: orders.orderNumber,
      orderStatus: orders.status
    })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(eq(orders.buyerId, buyerId))
    .orderBy(desc(payments.createdAt));
}

export async function listOrderItemsBySellerId(sellerId: string | null) {
  const db = getDb();
  const base = db
    .select({
      itemId: orderItems.id,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      orderStatus: orders.status,
      paymentAmount: orders.totalAmount,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      productName: products.name,
      fulfillmentType: orderItems.fulfillmentType,
      deliveryStatus: orderItems.deliveryStatus,
      createdAt: orderItems.createdAt
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id));

  return sellerId ? base.where(eq(orderItems.sellerId, sellerId)).orderBy(desc(orderItems.createdAt)) : base.orderBy(desc(orderItems.createdAt));
}

export async function listAdminOrders() {
  const db = getDb();
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      buyerName: users.name,
      buyerEmail: users.email,
      paymentStatus: payments.status,
      paymentUrl: payments.paymentUrl
    })
    .from(orders)
    .innerJoin(users, eq(orders.buyerId, users.id))
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .orderBy(desc(orders.createdAt));
}

export async function getOrderNotificationRecipient(orderId: string) {
  const db = getDb();
  const [recipient] = await db
    .select({ email: users.email, name: users.name, orderNumber: orders.orderNumber })
    .from(orders)
    .innerJoin(users, eq(orders.buyerId, users.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  return recipient ?? null;
}

export async function setAdminOrderStatus(orderId: string, action: "cancel" | "refund" | "fail") {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return null;

    const [payment] = await tx.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);

    if (action === "cancel") {
      await tx.update(orders).set({ status: "cancelled", updatedAt: new Date() }).where(eq(orders.id, orderId));
      if (payment?.status === "pending") {
        await tx.update(payments).set({ status: "expired", updatedAt: new Date() }).where(eq(payments.id, payment.id));
      }
    }

    if (action === "refund") {
      await tx.update(orders).set({ status: "refunded", updatedAt: new Date() }).where(eq(orders.id, orderId));
      if (payment) {
        await tx.update(payments).set({ status: "refunded", updatedAt: new Date() }).where(eq(payments.id, payment.id));
      }
    }

    if (action === "fail") {
      await tx.update(orders).set({ status: "failed", updatedAt: new Date() }).where(eq(orders.id, orderId));
      if (payment) {
        await tx.update(payments).set({ status: "failed", updatedAt: new Date() }).where(eq(payments.id, payment.id));
      }
    }

    return { order, payment: payment ?? null };
  });
}

export async function getOrderItemForSeller(itemId: number, sellerId: string | null) {
  const db = getDb();
  const [item] = await db.select().from(orderItems).where(eq(orderItems.id, itemId)).limit(1);
  if (!item) return null;
  if (sellerId && item.sellerId !== sellerId) return null;
  return item;
}

export async function submitManualDelivery(itemId: number, deliveryContent: Record<string, unknown>) {
  const db = getDb();
  const [item] = await db.update(orderItems).set({ deliveryContent, deliveryStatus: "delivered", deliveredAt: new Date() }).where(eq(orderItems.id, itemId)).returning();
  if (!item) return null;

  await db.update(orders).set({ status: "delivered", deliveredAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, item.orderId));
  return item;
}

export async function fulfillAutoDelivery(orderId: string) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).limit(1);
    if (!item) return "missing" as const;

    const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product || product.fulfillmentType !== "auto") {
      await tx.update(orders).set({ status: "processing", paidAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, orderId));
      return "processing" as const;
    }

    const [stock] = await tx
      .select()
      .from(productStocks)
      .where(and(eq(productStocks.productId, product.id), eq(productStocks.isSold, false)))
      .orderBy(asc(productStocks.createdAt))
      .limit(1);

    if (!stock) {
      await tx.update(orders).set({ status: "processing", paidAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, orderId));
      await tx.update(orderItems).set({ deliveryStatus: "failed" }).where(eq(orderItems.id, item.id));
      return "failed" as const;
    }

    const [updatedStock] = await tx
      .update(productStocks)
      .set({ isSold: true, transactionId: orderId, soldAt: new Date() })
      .where(and(eq(productStocks.id, stock.id), eq(productStocks.isSold, false)))
      .returning();

    if (!updatedStock) return "processing" as const;

    const deliveryContent = {
      credentials: updatedStock.content,
      deliveredAt: new Date().toISOString()
    };

    await tx.update(orderItems).set({ deliveryContent, deliveryStatus: "delivered", deliveredAt: new Date() }).where(eq(orderItems.id, item.id));
    await tx.update(orders).set({ status: "delivered", paidAt: new Date(), deliveredAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, orderId));
    
    // Sync delivered content to transactions table in aeternum_premiapp_db
    await tx.execute(sql`
      UPDATE transactions 
      SET delivered_content = ${updatedStock.content}, status = 'PAID', paid_at = NOW() 
      WHERE id = ${orderId} OR gateway_reference = ${orderId};
    `);

    return "delivered" as const;
  });
}
