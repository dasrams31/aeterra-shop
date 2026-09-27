import { notFound } from "next/navigation";
import { getProductBySlug, countAvailableStock } from "@/lib/products";
import { productPriceForUser } from "@/lib/pricing.js";
import { getReviewSummaryByProductId, listReviewsByProductId } from "@/lib/reviews";
import { getCurrentUser } from "@/lib/session-server";
import { getMarketplaceSettings } from "@/lib/sellers";
import Link from "next/link";

export const dynamic = "force-dynamic";

const formatMoney = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const checkoutSteps = [
  "Pilih metode pembayaran (QRIS Dinamis atau Saldo Dompet).",
  "Scan QRIS instan dari semua e-wallet (GoPay, OVO, DANA, BCA, ShopeePay).",
  "Kredensial atau lisensi akun langsung dikirim otomatis ke akun & Telegram."
];

const productHighlights = [
  "⚡ Auto-Delivery Instan 1 Detik",
  "🛡️ Garansi Penuh Akun & Lisensi",
  "🧾 Invoice & Riwayat Terverifikasi",
  "💬 Support Chat 24/7 Terbuka"
];

function stars(rating: number) {
  return "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, 5 - rating);
}

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const current = await getCurrentUser();
  const settings = await getMarketplaceSettings().catch(() => null);
  const price = productPriceForUser(product, current?.user);
  const hasResellerPrice = price !== product.price;
  const reviewSummary = await getReviewSummaryByProductId(product.id);
  const reviews = await listReviewsByProductId(product.id, 5);
  const availableStock = await countAvailableStock(product.id);

  const deliveryCopy = product.fulfillmentType === "auto"
    ? "Kredensial atau akses otomatis dikirimkan ke layar dan bot Telegram begitu pembayaran QRIS sukses."
    : "Pesanan diproses langsung oleh admin/seller dengan garansi penuh.";

  const userBalance = Number(current?.user?.balance ?? 0);
  const hasEnoughBalance = userBalance >= price;

  return (
    <main className="min-h-screen px-4 py-8 md:px-6 md:py-12 bg-background text-text">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted">
          <Link href="/marketplace" className="hover:text-text transition-colors">Marketplace</Link>
          <span>/</span>
          {product.categoryName && (
            <>
              <Link href={`/marketplace?category=${product.categorySlug}`} className="hover:text-text transition-colors">
                {product.categoryName}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-text font-semibold truncate max-w-xs">{product.name}</span>
        </div>

        {/* Main Product Info & Checkout Box */}
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          
          {/* Left: Product Hero Info */}
          <div className="rounded-3xl border border-border bg-white p-6 md:p-8 shadow-soft space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {product.categoryName && (
                  <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold">
                    {product.categoryName}
                  </span>
                )}
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 text-xs font-bold">
                  {product.fulfillmentType === "auto" ? "⚡ Auto-Delivery" : "🛠️ Manual Process"}
                </span>
                <span className="rounded-full bg-surfaceSoft border border-border px-3 py-1 text-xs font-medium text-muted">
                  Stok Tersedia: <b className="text-text">{availableStock}</b>
                </span>
              </div>

              <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-text leading-tight">
                {product.name}
              </h1>

              {reviewSummary.count > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-amber-400 font-bold tracking-widest">{stars(Math.round(reviewSummary.average))}</span>
                  <span className="font-bold text-text">{reviewSummary.average.toFixed(1)}</span>
                  <span className="text-xs text-muted">({reviewSummary.count} ulasan)</span>
                </div>
              )}
            </div>

            {/* Description Card */}
            <div className="border-t border-border pt-6">
              <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-3">Deskripsi Produk</h2>
              <div className="prose prose-sm max-w-none text-muted leading-relaxed whitespace-pre-line text-sm">
                {product.description}
              </div>
            </div>

            {/* Instructions if available */}
            {product.instructions && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-2">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Instruksi Penggunaan & Aktivasi</h3>
                <p className="text-xs text-text leading-relaxed whitespace-pre-line font-medium">
                  {product.instructions}
                </p>
              </div>
            )}

            {/* Feature Highlights Grid */}
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              {productHighlights.map((item) => (
                <div key={item} className="flex items-center gap-2.5 rounded-xl border border-border bg-surfaceSoft p-3 text-xs font-semibold text-text">
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Checkout Action Card */}
          <div className="sticky top-6 rounded-3xl border border-border bg-white p-6 shadow-soft space-y-6">
            <div>
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Harga Produk</span>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-3xl md:text-4xl font-black text-text tabular-nums">
                  {formatMoney.format(price)}
                </p>
                {hasResellerPrice && (
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    Harga Reseller Aktif
                  </span>
                )}
              </div>
            </div>

            <form className="space-y-4" method="post" action="/api/checkout">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="quantity" value={1} />

              <div className="space-y-2">
                <label className="text-xs font-bold text-text uppercase tracking-wider">Metode Pembayaran</label>
                
                {/* QRIS Option */}
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surfaceSoft cursor-pointer hover:border-primary transition-all">
                  <div className="flex items-center gap-3">
                    <input type="radio" name="paymentMethod" value="QRIS" defaultChecked className="accent-primary" />
                    <div>
                      <p className="text-sm font-bold text-text">QRIS Dinamis (KlikQRIS)</p>
                      <p className="text-[11px] text-muted">GoPay, OVO, DANA, BCA, ShopeePay</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">Instan</span>
                </label>

                {/* Balance Option */}
                <label className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  hasEnoughBalance 
                    ? "border-border bg-surfaceSoft cursor-pointer hover:border-primary" 
                    : "border-border/60 bg-surfaceSoft/50 opacity-60"
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="BALANCE" 
                      disabled={!hasEnoughBalance}
                      className="accent-primary" 
                    />
                    <div>
                      <p className="text-sm font-bold text-text">Saldo Dompet Internal</p>
                      <p className="text-[11px] text-muted">
                        Saldo Anda: <b>{formatMoney.format(userBalance)}</b>
                      </p>
                    </div>
                  </div>
                  {hasEnoughBalance ? (
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">Cukup</span>
                  ) : (
                    <span className="text-xs font-medium text-amber-600">Kurang</span>
                  )}
                </label>
              </div>

              {settings?.checkoutEnabled === false ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center text-xs font-semibold text-amber-600">
                  Checkout sedang dinonaktifkan oleh administrator.
                </div>
              ) : availableStock <= 0 && product.fulfillmentType === "auto" ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center text-xs font-semibold text-rose-600">
                  ⚠️ Mohon maaf, stok produk ini sedang kosong.
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Lanjut ke Pembayaran QRIS</span>
                  <span>→</span>
                </button>
              )}

              {!current && (
                <p className="text-center text-[11px] text-muted">
                  *Kamu akan diarahkan ke login/registrasi agar pesanan & lisensi tersimpan otomatis.
                </p>
              )}
            </form>

            <div className="rounded-2xl bg-surfaceSoft p-4 border border-border space-y-2 text-xs">
              <p className="font-bold text-text">ℹ️ Informasi Pengiriman:</p>
              <p className="text-muted leading-relaxed">{deliveryCopy}</p>
            </div>
          </div>
        </section>

        {/* Steps Guide */}
        <section className="rounded-3xl border border-border bg-white p-6 md:p-8 shadow-soft space-y-6">
          <h2 className="text-lg font-bold text-text">3 Langkah Mudah Berbelanja</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {checkoutSteps.map((step, idx) => (
              <div key={step} className="flex items-start gap-3.5 rounded-2xl border border-border bg-surfaceSoft p-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <p className="text-xs font-medium text-text leading-relaxed mt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Customer Reviews Section */}
        {reviews.length > 0 && (
          <section className="rounded-3xl border border-border bg-white p-6 md:p-8 shadow-soft space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-text">Ulasan Pelanggan</h2>
                <p className="text-xs text-muted mt-0.5">Testimoni nyata dari pembeli produk ini</p>
              </div>
              <div className="text-right">
                <span className="text-amber-400 font-bold tracking-widest text-sm">{stars(Math.round(reviewSummary.average))}</span>
                <span className="ml-1 text-xs font-bold text-text">{reviewSummary.average.toFixed(1)} / 5.0</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {reviews.map((rev) => (
                <article key={rev.id} className="rounded-2xl border border-border bg-surfaceSoft p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text">{rev.buyerName}</span>
                    <span className="text-xs text-amber-500 font-semibold">{stars(rev.rating)}</span>
                  </div>
                  {rev.comment && (
                    <p className="text-xs text-muted leading-relaxed italic">"{rev.comment}"</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
