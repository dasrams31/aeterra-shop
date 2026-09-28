import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { getCurrentUser } from "@/lib/session-server";
import { slugify } from "@/lib/slug";
import { redirectApp } from "@/lib/redirect";

const packageSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  instructions: z.string().optional(),
  price: z.coerce.number().int().positive(),
  resellerPrice: z.coerce.number().int().nonnegative().optional(),
  fulfillmentType: z.enum(["auto", "manual"]),
  status: z.enum(["draft", "active", "inactive", "blocked"]).default("active")
});

export async function POST(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current || current.session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const payload = packageSchema.parse({
    name: form.get("name"),
    description: form.get("description"),
    instructions: form.get("instructions") || undefined,
    price: form.get("price"),
    resellerPrice: form.get("resellerPrice") || undefined,
    fulfillmentType: form.get("fulfillmentType"),
    status: form.get("status") || "active"
  });

  const db = getDb();
  const slug = `${slugify(payload.name)}-${Math.random().toString(36).slice(2, 6)}`;

  await db.insert(products).values({
    sellerId: null,
    categoryId: null,
    name: payload.name,
    slug,
    description: payload.description,
    instructions: payload.instructions ?? null,
    price: payload.price,
    resellerPrice: payload.resellerPrice ?? null,
    fulfillmentType: payload.fulfillmentType,
    status: payload.status,
    isCustomPackage: true
  });

  return redirectApp("/admin/packages", request);
}
