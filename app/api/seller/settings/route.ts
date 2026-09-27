import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session-server";
import { slugify } from "@/lib/slug";
import { updateSellerProfile } from "@/lib/sellers";
import { logActivity } from "@/lib/activity";

const settingsSchema = z.object({
  storeName: z.string().min(3).max(80),
  storeSlug: z.string().min(3).max(80),
  description: z.string().max(500).optional()
});

export async function POST(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current || current.session.role !== "seller") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const payload = settingsSchema.parse({
    storeName: form.get("storeName"),
    storeSlug: form.get("storeSlug"),
    description: form.get("description") || undefined
  });

  const result = await updateSellerProfile(current.user.id, {
    storeName: payload.storeName,
    storeSlug: slugify(payload.storeSlug),
    description: payload.description ?? null
  });

  if (!result) return NextResponse.json({ error: "Seller profile not found" }, { status: 404 });

  await logActivity({ actorId: current.user.id, action: "seller.settings_updated", entityType: "seller_profile", entityId: result.id });
  return NextResponse.redirect(new URL("/seller/settings?updated=1", request.url), { status: 303 });
}
