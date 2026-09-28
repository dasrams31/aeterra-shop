import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { orderItems, orders, payments, products, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/session-server";
import { createKlikQrisTransaction } from "@/lib/klikqris";
import { createOrderNumber, fulfillAutoDelivery } from "@/lib/orders";
import { logActivity } from "@/lib/activity";
import { canCheckout } from "@/lib/backend-guards.js";
import { defaultPaymentProvider } from "@/lib/payment-providers.js";
import { productPriceForUser } from "@/lib/pricing.js";
import { getReferralCodeForUserSignup } from "@/lib/referrals-data";
import { getMarketplaceSettings } from "@/lib/sellers";
import { getAppBaseUrl, redirectApp } from "@/lib/redirect";
import { eq, sql } from "drizzle-orm";

const checkoutSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().default(1),
  paymentMethod: z.enum(["QRIS", "BALANCE"]).default("QRIS")
});

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return redirectApp("/login", request);
  }

  const form = await request.formData();
  const payload = checkoutSchema.parse({
    productId: form.get("productId"),
    quantity: form.get("quantity") ?? 1,
    paymentMethod: form.get("paymentMethod") ?? "QRIS"
  });

  const db = getDb();
  const settings = await getMarketplaceSettings();
  if (!canCheckout(settings)) {
    return NextResponse.json({ error: "Checkout sedang dinonaktifkan" }, { status: 403 });
  }

  const [product] = await db.select().from(products).where(eq(products.id, payload.productId)).limit(1);
  if (!product || (product.status !== "active" && !product.isActive)) {
    return NextResponse.json({ error: "Produk tidak tersedia" }, { status: 404 });
  }

  const orderNumber = createOrderNumber();
  const unitPrice = productPriceForUser(product, current.user);
  const baseAmount = unitPrice * payload.quantity;
  const referralCode = await getReferralCodeForUserSignup(current.user.id);
  const appUrl = getAppBaseUrl(request);

  // Option A: Bayar dengan Saldo Internal
  if (payload.paymentMethod === "BALANCE") {
    const userBalance = Number(current.user.balance ?? 0);
    if (userBalance < baseAmount) {
      return NextResponse.json({ error: "Saldo tidak mencukupi" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // Deduct balance atomically
      await tx
        .update(users)
        .set({
          balance: sql`balance - ${baseAmount}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, current.user.id));

      const [order] = await tx
        .insert(orders)
        .values({
          id: orderNumber,
          buyerId: current.user.id,
          orderNumber,
          status: "paid",
          totalAmount: baseAmount,
          paidAt: new Date()
        })
        .returning();

      await tx.insert(orderItems).values({
        orderId: order.id,
        productId: product.id,
        sellerId: product.sellerId,
        quantity: payload.quantity,
        unitPrice: unitPrice,
        fulfillmentType: product.fulfillmentType,
        deliveryStatus: "pending"
      });

      await tx.insert(payments).values({
        orderId: order.id,
        provider: "balance",
        providerReference: orderNumber,
        amount: baseAmount,
        status: "paid",
        paidAt: new Date()
      });

      // Synchronize with transactions table in aeternum_premiapp_db
      await tx.execute(sql`
        INSERT INTO transactions (
          id, user_id, product_id, trx_type, payment_method, 
          original_amount, discount_amount, amount, reminder_h3_sent, reminder_h1_sent, status, paid_at, created_at
        ) VALUES (
          ${orderNumber}, ${current.user.id}, ${product.id}, 'PURCHASE', 'BALANCE',
          ${baseAmount}, 0, ${baseAmount}, false, false, 'PAID', NOW(), NOW()
        ) ON CONFLICT (id) DO UPDATE SET status = 'PAID', paid_at = NOW();
      `);

      return order;
    });

    await fulfillAutoDelivery(result.id);

    await logActivity({
      actorId: current.user.id,
      action: "order.paid_balance",
      entityType: "order",
      entityId: String(result.id),
      metadata: { orderNumber, productId: product.id, quantity: payload.quantity, amount: baseAmount }
    });

    return redirectApp(`/dashboard/orders/${orderNumber}`, request);
  }

  // Option B: Bayar via QRIS (KlikQRIS)
  const redirectUrl = `${appUrl}/dashboard/orders/${orderNumber}`;
  const klikQrisRes = await createKlikQrisTransaction({
    orderId: orderNumber,
    amount: baseAmount,
    customerName: current.user.name || current.user.firstName || "Pelanggan",
    description: `Order #${orderNumber} - ${product.name}`,
    redirectUrl
  });

  const finalAmount = klikQrisRes.success ? klikQrisRes.totalAmount : baseAmount;

  const [order] = await db
    .insert(orders)
    .values({
      id: orderNumber,
      buyerId: current.user.id,
      orderNumber,
      status: "pending_payment",
      totalAmount: finalAmount
    })
    .returning();

  await db.insert(orderItems).values({
    orderId: order.id,
    productId: product.id,
    sellerId: product.sellerId,
    quantity: payload.quantity,
    unitPrice: unitPrice,
    fulfillmentType: product.fulfillmentType,
    deliveryStatus: "pending"
  });

  await db.insert(payments).values({
    orderId: order.id,
    provider: defaultPaymentProvider,
    providerReference: orderNumber,
    paymentUrl: klikQrisRes.reportUrl || klikQrisRes.qrisUrl,
    qrisImage: klikQrisRes.qrisImage,
    amount: finalAmount,
    status: "pending",
    rawPayload: klikQrisRes
  });

  // Synchronize transaction into transactions table
  await db.execute(sql`
    INSERT INTO transactions (
      id, user_id, product_id, trx_type, payment_method, 
      original_amount, discount_amount, amount, qris_string, qris_image_url, 
      gateway_reference, reminder_h3_sent, reminder_h1_sent, status, expired_at, created_at
    ) VALUES (
      ${orderNumber}, ${current.user.id}, ${product.id}, 'PURCHASE', 'QRIS',
      ${baseAmount}, 0, ${finalAmount}, '', ${klikQrisRes.qrisUrl ?? ''},
      ${orderNumber}, false, false, 'PENDING', NOW() + INTERVAL '1 hour', NOW()
    ) ON CONFLICT (id) DO UPDATE SET 
      amount = ${finalAmount}, 
      qris_image_url = ${klikQrisRes.qrisUrl ?? ''};
  `);

  await logActivity({
    actorId: current.user.id,
    action: "order.created",
    entityType: "order",
    entityId: order.id,
    metadata: {
      orderNumber,
      productId: product.id,
      quantity: payload.quantity,
      amount: finalAmount,
      provider: defaultPaymentProvider,
      referralCode
    }
  });

  return redirectApp(`/dashboard/orders/${orderNumber}`, request);
}
