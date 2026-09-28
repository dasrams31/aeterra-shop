import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setAdminOrderStatus } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session-server";
import { logActivity } from "@/lib/activity";
import { redirectApp } from "@/lib/redirect";

const statusSchema = z.object({
  action: z.enum(["cancel", "refund", "fail"])
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || current.session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const form = await request.formData();
  const payload = statusSchema.parse({ action: form.get("action") });

  const detail = await setAdminOrderStatus(id, payload.action);
  if (!detail) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await logActivity({
    actorId: current.user.id,
    action: `order.${payload.action}`,
    entityType: "order",
    entityId: id,
    metadata: { action: payload.action, orderNumber: detail.order.orderNumber }
  });

  return redirectApp(`/admin/orders/${detail.order.orderNumber}`, request);
}
