import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { getCurrentUser } from "@/lib/session-server";
import { ensureSellerProfile, findApprovedSellerProfileByUserId } from "@/lib/sellers";
import { slugify } from "@/lib/slug";
import { redirectApp } from "@/lib/redirect";

const productSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  instructions: z.string().optional(),
  price: z.coerce.number().int().positive(),
  resellerPrice: z.coerce.number().int().nonnegative().optional(),
  fulfillmentType: z.enum(["auto", "manual"]),
  status: z.enum(["draft", "active", "inactive", "blocked"]),
  categoryId: z.coerce.number().int().positive().optional(),
  isCustomPackage: z.coerce.boolean().optional()
});

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
  const form = await request.formData();
  const payload = productSchema.parse({
    name: form.get("name"),
    description: form.get("description"),
    instructions: form.get("instructions") || undefined,
    price: form.get("price"),
    resellerPrice: form.get("resellerPrice") || undefined,
    fulfillmentType: form.get("fulfillmentType"),
    status: form.get("status") || "draft",
    categoryId: form.get("categoryId") || undefined,
    isCustomPackage: form.get("isCustomPackage") === "on"
  });

  const db = getDb();
  const sellerProfile = current.session.role === "seller"
    ? await ensureSellerProfile(current.user.id, `${current.user.name}'s Store`, slugify(`${current.user.name}-store`))
    : null;

  const updates = {
    categoryId: payload.categoryId ?? null,
    name: payload.name,
    slug: `${slugify(payload.name)}-${idNum}`,
    description: payload.description,
    instructions: payload.instructions ?? null,
    price: payload.price,
    resellerPrice: payload.resellerPrice ?? null,
    fulfillmentType: payload.fulfillmentType,
    status: payload.status,
    isCustomPackage: payload.isCustomPackage ?? false,
    updatedAt: new Date()
  };

  if (current.session.role === "admin") {
    await db.update(products).set(updates).where(eq(products.id, idNum));
  } else {
    await db.update(products).set({ ...updates, sellerId: sellerProfile?.id ?? null }).where(and(eq(products.id, idNum), eq(products.sellerId, sellerProfile?.id ?? "")));
  }

  return redirectApp(current.session.role === "admin" ? "/admin/products" : "/seller/products", request);
}
