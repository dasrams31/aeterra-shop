import { NextRequest, NextResponse } from "next/server";
import { getOrderItemForSeller, getOrderNotificationRecipient, submitManualDelivery } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session-server";
import { findApprovedSellerProfileByUserId } from "@/lib/sellers";
import { logActivity } from "@/lib/activity";
import { sendNotificationEmail } from "@/lib/email";
import { canAccessSellerItem } from "@/lib/backend-guards.js";
import { redirectApp } from "@/lib/redirect";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || (current.session.role !== "seller" && current.session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (current.session.role === "seller" && !(await findApprovedSellerProfileByUserId(current.user.id))) {
    return NextResponse.json({ error: "Seller not approved" }, { status: 403 });
  }

  const { id } = await params;
  const idNum = Number(id);
  const sellerId = current.session.role === "seller" ? (await findApprovedSellerProfileByUserId(current.user.id))?.id ?? null : null;
  const item = await getOrderItemForSeller(idNum, sellerId);
  if (!item || item.fulfillmentType !== "manual" || !canAccessSellerItem({ isAdmin: current.session.role === "admin", sellerId: item.sellerId, userSellerId: sellerId })) {
    return NextResponse.json({ error: "Order item not found" }, { status: 404 });
  }

  const form = await request.formData();
  const raw = String(form.get("deliveryContent") ?? "");
  const deliveryContent = JSON.parse(raw) as Record<string, unknown>;
  await submitManualDelivery(idNum, deliveryContent);
  const recipient = await getOrderNotificationRecipient(item.orderId);
  await sendNotificationEmail({
    to: recipient?.email,
    subject: `Pesanan ${recipient?.orderNumber ?? "Aeternum Shop"} sudah delivered`,
    text: `Pesanan manual kamu sudah delivered. Login ke dashboard order untuk melihat detail akses produk.`
  });
  await logActivity({ actorId: current.user.id, action: "order.manual_delivered", entityType: "order_item", entityId: String(id), metadata: { role: current.session.role } });

  return redirectApp(`/seller/orders/${id}`, request);
}
