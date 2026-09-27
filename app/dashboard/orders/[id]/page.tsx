import { getOrderDetailByNumber } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session-server";
import { notFound } from "next/navigation";
import { canAccessOrder } from "@/lib/backend-guards.js";
import Link from "next/link";
import OrderLiveChecker from "./order-live-checker";

export const dynamic = "force-dynamic";

const formatMoney = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default async function DashboardOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) notFound();

  const { id } = await params;
  const detail = await getOrderDetailByNumber(id);
  if (!detail) notFound();

  if (!canAccessOrder({ isAdmin: current.session.role === "admin", buyerId: String(detail.order.buyerId), userId: String(current.user.id) })) {
    notFound();
  }

  const isPending = detail.order.status === "pending_payment" || detail.payment?.status === "pending";
  const isDelivered = detail.order.status === "delivered";
  const isPaid = detail.order.status === "paid" || isDelivered;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/orders" className="text-xs font-semibold text-muted hover:text-text">
              ← Kembali ke Pesanan
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">
            Invoice #{detail.order.orderNumber}
          </h1>
          <p className="mt-1 text-xs text-muted">
            Dibuat pada: {new Date(detail.order.createdAt).toLocaleString("id-ID")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDelivered && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Selesai & Terkirim
            </span>
          )}
          {isPaid && !isDelivered && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              Lunas (Memproses Pengiriman)
            </span>
          )}
          {isPending && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Menunggu Pembayaran
            </span>
          )}
        </div>
      </div>

      {/* QRIS Section if pending */}
      {isPending && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-soft">
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div className="flex flex-col items-center justify-center rounded-xl bg-white p-4 shadow-sm">
              {detail.payment?.qrisImage ? (
                <img
                  src={detail.payment.qrisImage.startsWith("data:") ? detail.payment.qrisImage : `data:image/png;base64,${detail.payment.qrisImage}`}
                  alt="QRIS Payment"
                  className="h-64 w-64 object-contain"
                />
              ) : detail.payment?.paymentUrl ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <p className="text-sm font-medium text-text">Scan atau Buka Halaman QRIS Resmi</p>
                  <a
                    href={detail.payment.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                  >
                    Buka Halaman Pembayaran QRIS ↗
                  </a>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-muted">Memuat QRIS...</div>
              )}
              <span className="mt-2 text-[11px] font-medium text-slate-500">
                Support: GoPay, OVO, DANA, BCA, Livin, ShopeePay
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Total Tagihan</span>
                <p className="text-3xl font-extrabold text-text tabular-nums">
                  {formatMoney.format(Number(detail.order.totalAmount))}
                </p>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  *Pastikan nominal transfer tepat hingga digit terakhir termasuk kode unik.
                </p>
              </div>

              <div className="rounded-xl bg-surfaceSoft p-3.5 text-xs text-text space-y-1.5">
                <p className="font-semibold text-text">Petunjuk Pembayaran:</p>
                <ol className="list-decimal pl-4 space-y-1 text-muted">
                  <li>Scan kode QR di samping menggunakan aplikasi e-wallet atau mobile banking apa saja.</li>
                  <li>Selesaikan transfer. Sistem akan otomatis memverifikasi dalam beberapa detik.</li>
                  <li>Atau klik tombol <b>Cek Status Sekarang</b> di bawah.</li>
                </ol>
              </div>

              <OrderLiveChecker orderNumber={detail.order.orderNumber} />
            </div>
          </div>
        </div>
      )}

      {/* Ordered Items */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-soft">
        <h2 className="text-base font-bold text-text mb-4">Rincian Produk</h2>
        <div className="divide-y divide-border">
          {detail.items.map((item) => (
            <div key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-text">{item.productName}</h3>
                  <p className="text-xs text-muted">
                    Qty: {item.quantity} × {formatMoney.format(Number(item.unitPrice))}
                  </p>
                </div>
                <p className="text-sm font-bold text-text tabular-nums">
                  {formatMoney.format(Number(item.unitPrice) * item.quantity)}
                </p>
              </div>

              {/* Delivered Credentials */}
              {Boolean(item.deliveryContent) && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      🎉 Kredensial / Lisensi Produk Anda:
                    </span>
                    <span className="text-[11px] text-muted">Siap Digunakan</span>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-white p-3 font-mono text-xs text-text shadow-sm border border-border">
                    {typeof item.deliveryContent === "object" && item.deliveryContent !== null && "credentials" in (item.deliveryContent as Record<string, any>)
                      ? String((item.deliveryContent as Record<string, any>).credentials)
                      : JSON.stringify(item.deliveryContent ?? {}, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Support / Warranty Ticket Form */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-soft">
        <h2 className="text-base font-bold text-text mb-1">Butuh Bantuan atau Klaim Garansi?</h2>
        <p className="text-xs text-muted mb-4">
          Tim support Aeternum siap membantu kendala akun, replace, atau panduan penggunaan 24/7.
        </p>
        <form className="grid gap-3" method="post" action="/api/tickets">
          <input type="hidden" name="orderId" value={detail.order.id} />
          <input
            name="subject"
            className="rounded-xl border border-border bg-surfaceSoft px-3.5 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Tuliskan kendala Anda secara singkat..."
            required
          />
          <button
            type="submit"
            className="w-fit rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            Buka Tiket Support ↗
          </button>
        </form>
      </div>
    </div>
  );
}
