import Link from "next/link";
import { listCategories, listMarketplaceProducts } from "@/lib/products";
import { formatPrice } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const [products, categories] = await Promise.all([listMarketplaceProducts(q, category), listCategories()]);

  return (
    <div className="space-y-10">
      {/* Header Banner */}
      <section className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 p-8 sm:p-12 text-white border border-purple-800 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-bold">
            <i className="fa-solid fa-store text-yellow-400"></i> Katalog Resmi Aeternum Shop
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Katalog Produk & Layanan Premium</h1>
          <p className="text-sm text-purple-200/80 leading-relaxed max-w-2xl font-medium">
            Temukan akun premium, tools AI kreatif, script otomatisasi Python, dan software original dengan aktivasi instan serta garansi penuh.
          </p>

          <form action="/marketplace" method="GET" className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Cari produk (contoh: Canva, Gemini, Script, Spotify)..."
                className="w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-purple-500/40 rounded-2xl text-sm font-medium text-white placeholder:text-slate-400 focus:outline-none focus:border-yellow-400 transition"
              />
            </div>
            {category && <input type="hidden" name="category" value={category} />}
            <button
              type="submit"
              className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-2xl text-sm transition flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-yellow-400/20"
            >
              <i className="fa-solid fa-search"></i> Cari
            </button>
          </form>
        </div>
      </section>

      {/* Dynamic Category Badges Switcher */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pilih Kategori Produk</span>
          {category && (
            <Link href="/marketplace" className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1">
              <i className="fa-solid fa-xmark"></i> Reset Filter
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5 overflow-x-auto pb-2">
          <Link
            href="/marketplace"
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
              !category
                ? "bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:border-purple-500/50 hover:text-white"
            }`}
          >
            <i className="fa-solid fa-layer-group"></i> Semua ({products.length})
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/marketplace?category=${cat.slug}`}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                category === cat.slug
                  ? "bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:border-purple-500/50 hover:text-white"
              }`}
            >
              <span>{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Product Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-bold text-slate-400">
            Menampilkan <strong className="text-white">{products.length}</strong> produk tersedia
          </span>
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-slate-500 flex items-center justify-center mx-auto text-2xl">
              <i className="fa-solid fa-box-open"></i>
            </div>
            <h3 className="text-base font-bold text-white">Tidak ada produk ditemukan</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Coba gunakan kata kunci pencarian lain atau pilih kategori yang berbeda.
            </p>
            <Link href="/marketplace" className="inline-block mt-2 text-xs font-bold text-yellow-400 hover:underline">
              Lihat semua katalog produk
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => (
              <div
                key={p.id}
                className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-purple-500/50 hover:bg-slate-900 transition-all group shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                      {p.categoryName || "General"}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <i className="fa-solid fa-bolt text-[9px]"></i> Ready Stock
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 transition leading-snug line-clamp-2">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Harga</div>
                    <div className="text-base font-black text-white font-mono">
                      {formatPrice(p.price)}
                    </div>
                  </div>
                  <Link
                    href={`/products/${p.slug}`}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                  >
                    Beli <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
