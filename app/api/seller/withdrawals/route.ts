import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session-server";
import { findApprovedSellerProfileByUserId } from "@/lib/sellers";
import { createSellerWithdrawalRequest } from "@/lib/wallet";
import { logActivity } from "@/lib/activity";
import { sendNotificationEmail } from "@/lib/email";
import { redirectApp } from "@/lib/redirect";

const withdrawalSchema = z.object({
  amount: z.coerce.number().int().positive()
});

export async function POST(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current) return redirectApp("/login", request);

  const profile = await findApprovedSellerProfileByUserId(current.user.id);
  if (!profile) return NextResponse.json({ error: "Seller profile not approved" }, { status: 403 });

  const form = await request.formData();
  const payload = withdrawalSchema.parse({ amount: form.get("amount") });
  const requestRow = await createSellerWithdrawalRequest({
    sellerId: profile.id,
    userId: current.user.id,
    amount: payload.amount
  });

  if (!requestRow) {
    return NextResponse.json({ error: "Gagal membuat request penarikan" }, { status: 500 });
  }

  await logActivity({
    actorId: current.user.id,
    action: "seller.withdrawal_requested",
    entityType: "seller_withdrawal_request",
    entityId: requestRow.id,
    metadata: { amount: payload.amount, sellerId: profile.id }
  });

  const amountText = `Rp ${payload.amount.toLocaleString("id-ID")}`;
  await sendNotificationEmail({
    to: process.env.SUPPORT_EMAIL,
    subject: `Request penarikan saldo seller: ${amountText}`,
    text: `Seller ${profile.storeName} (${current.user.email}) mengajukan penarikan saldo sebesar ${amountText}.`
  });

  return redirectApp("/seller/wallet", request);
}
