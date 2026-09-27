import { notFound } from "next/navigation";
import { getOrderItemForSeller } from "@/lib/orders";
import { calculateMarketplaceCommission } from "@/lib/pricing.js";
import { getCurrentUser } from "@/lib/session-server";
import { findSellerProfileByUserId } from "@/lib/sellers";
import { canAccessSellerItem } from "@/lib/backend-guards.js";

export const dynamic = "force-dynamic";

const formatMoney = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default async function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) notFound();

  const { id } = await params;
  const idNum = Number(id);

  const sellerId = current.session.role === "seller" ? (await findSellerProfileByUserId(current.user.id))?.id ?? null : null;
  const item = await getOrderItemForSeller(idNum, sellerId);
  if (item && !canAccessSellerItem({ isAdmin: current.session.role === "admin", sellerId: item.sellerId, userSellerId: sellerId })) notFound();
  if (!item) notFound();
  const commission = calculateMarketplaceCommission(item.unitPrice * item.quantity);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Detail Pesanan</h1>
      <p className="mt-2 text-sm text-muted">Delivery: {item.deliveryStatus} · Type: {item.fulfillmentType}</p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl2 border-[3px] border-border bg-white p-4 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Gross</p>
          <p className="mt-2 text-sm text-muted">{formatMoney.format(commission.grossAmount)}</p>
        </div>
        <div className="rounded-xl2 border-[3px] border-border bg-white p-4 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Fee Platform</p>
          <p className="mt-2 text-sm text-muted">{formatMoney.format(commission.platformFee)}</p>
        </div>
        <div className="rounded-xl2 border-[3px] border-border bg-white p-4 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Net Seller</p>
          <p className="mt-2 text-sm text-muted">{formatMoney.format(commission.sellerNetAmount)}</p>
        </div>
      </div>

      {item.deliveryContent ? (
        <pre className="mt-6 overflow-auto rounded-xl2 border-[3px] border-border bg-surfaceSoft p-4 text-xs text-text shadow-soft">{JSON.stringify(item.deliveryContent, null, 2)}</pre>
      ) : null}

      {item.fulfillmentType === "manual" && item.deliveryStatus !== "delivered" ? (
        <form className="mt-6 grid gap-3 rounded-xl2 border-[3px] border-border bg-white p-4 shadow-soft" method="post" action={`/api/seller/orders/${item.id}/deliver`}>
          <label className="text-sm font-black">Isi data produk manual</label>
          <textarea className="min-h-40 rounded-xl border-[3px] border-border bg-surfaceSoft px-4 py-3 text-sm" name="deliveryContent" placeholder='{"email":"","password":"","notes":""}' required />
          <button className="rounded-xl border-[3px] border-border bg-primary px-4 py-3 text-sm font-black text-white shadow-soft">Kirim ke Buyer</button>
        </form>
      ) : null}
    </div>
  );
}
