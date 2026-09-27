import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { getCurrentUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) notFound();

  const { id } = await params;
  const idNum = Number(id);

  const db = getDb();
  const [product] = await db.select().from(products).where(eq(products.id, idNum)).limit(1);
  if (!product) notFound();

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Edit Produk</h1>
      <p className="mt-2 text-sm text-muted">Ubah data produk digital.</p>

      <form className="mt-6 grid gap-4" method="post" action={`/api/seller/products/${product.id}`}>
        <input className="rounded-xl border border-border px-4 py-3" name="name" defaultValue={product.name} required />
        <textarea className="min-h-32 rounded-xl border border-border px-4 py-3" name="description" defaultValue={product.description} required />
        <textarea className="min-h-24 rounded-xl border border-border px-4 py-3" name="instructions" defaultValue={product.instructions ?? ""} />
        <div className="grid gap-4 md:grid-cols-2">
          <input className="rounded-xl border border-border px-4 py-3" name="price" type="number" defaultValue={product.price} required />
          <input className="rounded-xl border border-border px-4 py-3" name="resellerPrice" type="number" defaultValue={product.resellerPrice ?? ""} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <select className="rounded-xl border border-border px-4 py-3" name="fulfillmentType" defaultValue={product.fulfillmentType}>
            <option value="auto">Auto</option>
            <option value="manual">Manual</option>
          </select>
          <select className="rounded-xl border border-border px-4 py-3" name="status" defaultValue={product.status}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <button className="rounded-xl bg-primary px-4 py-3 font-medium text-white">Update Produk</button>
      </form>
    </div>
  );
}
