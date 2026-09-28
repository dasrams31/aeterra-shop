import Link from "next/link";
import { listPaymentsByBuyerId } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

const formatMoney = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default async function DashboardPaymentsPage() {
  const current = await getCurrentUser();
  const payments = current ? await listPaymentsByBuyerId(current.user.id) : [];

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Pembayaran</h1>
      <p className="mt-2 text-sm text-muted">Riwayat pembayaran akun kamu.</p>
      <div className="mt-6 space-y-3">
        {payments.length === 0 ? <div className="rounded-xl2 border border-border p-4 text-sm text-muted">Belum ada pembayaran.</div> : payments.map((payment) => (
          <article key={payment.id} className="rounded-xl2 border border-border bg-white p-4 shadow-soft">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">{payment.orderNumber}</p>
                <p className="mt-1 text-sm text-muted">{payment.status} · order {payment.orderStatus} · {formatMoney.format(payment.amount)}</p>
                <p className="mt-1 text-xs text-muted">{payment.providerReference}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium" href={`/dashboard/orders/${payment.orderNumber}`}>Detail Order & QRIS</Link>
                {payment.status === "pending" && (
                  <Link className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white" href={`/dashboard/orders/${payment.orderNumber}`}>
                    Bayar / Scan QRIS
                  </Link>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
