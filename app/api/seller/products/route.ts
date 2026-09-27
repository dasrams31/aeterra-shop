import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { getCurrentUser } from "@/lib/session-server";
import { ensureSellerProfile, findApprovedSellerProfileByUserId } from "@/lib/sellers";
import { slugify } from "@/lib/slug";

const productSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  instructions: z.string().optional(),
  price: z.coerce.number().int().positive(),
  resellerPrice: z.coerce.number().int().nonnegative().optional(),
  fulfillmentType: z.enum(["auto", "manual"]),
  status: z.enum(["draft", "active", "inactive", "blocked"]).default("active"),
  categoryId: z.coerce.number().int().positive().optional(),
  isCustomPackage: z.coerce.boolean().optional()
});

function forbidden(url: string) {
  return NextResponse.redirect(new URL(url, process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL : "http://localhost:3000"));
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current || (current.session.role !== "seller" && current.session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (current.session.role === "seller" && !(await findApprovedSellerProfileByUserId(current.user.id))) {
    return NextResponse.json({ error: "Seller not approved" }, { status: 403 });
  }

  const form = await request.formData();
  const payload = productSchema.parse({
    name: form.get("name"),
    description: form.get("description"),
    instructions: form.get("instructions") || undefined,
    price: form.get("price"),
    resellerPrice: form.get("resellerPrice") || undefined,
    fulfillmentType: form.get("fulfillmentType"),
    status: form.get("status") || "active",
    categoryId: form.get("categoryId") || undefined,
    isCustomPackage: form.get("isCustomPackage") === "on"
  });

  const db = getDb();
  const sellerProfile = current.session.role === "seller"
    ? await ensureSellerProfile(current.user.id, `${current.user.name}'s Store`, slugify(`${current.user.name}-store`))
    : null;

  const slugBase = slugify(payload.name);
  const uniqueSuffix = Math.random().toString(36).slice(2, 6);
  const slug = `${slugBase}-${uniqueSuffix}`;

  const [product] = await db
    .insert(products)
    .values({
      sellerId: sellerProfile?.id ?? null,
      categoryId: payload.categoryId ?? null,
      name: payload.name,
      slug,
      description: payload.description,
      instructions: payload.instructions ?? null,
      price: payload.price,
      resellerPrice: payload.resellerPrice ?? null,
      fulfillmentType: payload.fulfillmentType,
      status: payload.status,
      isCustomPackage: payload.isCustomPackage ?? false
    })
    .returning();

  return NextResponse.redirect(new URL(current.session.role === "admin" ? "/admin/products" : "/seller/products", request.url), {
    status: 303
  });
}
