import { getCurrentUser } from "@/lib/session-server";
import { buildReferralUrl, referralCodeForUser } from "@/lib/referrals.js";
import { getReferralStatsForCode } from "@/lib/referrals-data";

export const dynamic = "force-dynamic";

const formatMoney = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default async function DashboardResellerPage() {
  const current = await getCurrentUser();
  const status = current?.user.resellerStatus ?? "none";
  const referralCode = current ? referralCodeForUser(current.user) : "";
  const referralUrl = referralCode ? buildReferralUrl(process.env.NEXT_PUBLIC_APP_URL ?? "https://shop.dasrams.biz.id", referralCode) : "";
  const referralStats = referralCode ? await getReferralStatsForCode(referralCode) : { count: 0, orderCount: 0, revenue: 0, rows: [] };

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Reseller</h1>
      <p className="mt-2 text-sm text-muted">Status pengajuan harga khusus.</p>
      <div className="mt-6 rounded-xl2 border border-border bg-white p-4 shadow-soft">
        <p className="text-sm font-semibold">Status: {status}</p>
        <p className="mt-2 text-sm text-muted">Jika approved, akun bisa memakai harga khusus pada produk yang menyediakan harga reseller.</p>
        {status === "none" || status === "rejected" ? (
          <form className="mt-4" method="post" action="/api/reseller/request">
            <button className="rounded-xl border border-border bg-primary px-4 py-2 text-sm font-semibold text-white">Ajukan reseller</button>
          </form>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl2 border border-border bg-white p-4 shadow-soft">
        <p className="text-sm font-semibold">Referral link</p>
        <p className="mt-2 text-sm text-muted">Bagikan link ini untuk mengajak buyer baru. Tracking komisi affiliate belum aktif.</p>
        <input className="mt-3 w-full rounded-xl border border-border bg-surfaceSoft px-3 py-2 text-sm" readOnly value={referralUrl} />
        <p className="mt-2 text-xs text-muted">Kode: {referralCode}</p>
        <p className="mt-3 text-sm font-semibold">Total signup referral: {referralStats.count}</p>
        <p className="mt-1 text-sm font-semibold">Order referral: {referralStats.orderCount} · {formatMoney.format(referralStats.revenue)}</p>
        <div className="mt-3 space-y-2">
          {referralStats.rows.length === 0 ? (
            <p className="text-sm text-muted">Belum ada signup dari referral link ini.</p>
          ) : (
            referralStats.rows.map((row) => (
              <div key={`${row.actorEmail}-${row.createdAt.toISOString()}`} className="rounded-xl border border-border bg-surfaceSoft px-3 py-2 text-sm">
                <p className="font-semibold">{row.actorName}</p>
                <p className="text-xs text-muted">{row.actorEmail}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
