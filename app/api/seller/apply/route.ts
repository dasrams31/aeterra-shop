import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session-server";
import { applySellerProfile, isStoreSlugAvailable } from "@/lib/sellers";
import { slugify } from "@/lib/slug";
import { logActivity } from "@/lib/activity";
import { redirectApp } from "@/lib/redirect";

const applySchema = z.object({
  storeName: z.string().min(3).max(80),
  storeSlug: z.string().min(3).max(80),
  description: z.string().max(500).optional()
});

export async function POST(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current) return redirectApp("/login", request);

  const form = await request.formData();
  const payload = applySchema.parse({
    storeName: form.get("storeName"),
    storeSlug: form.get("storeSlug"),
    description: form.get("description") || undefined
  });

  const slug = slugify(payload.storeSlug);
  const available = await isStoreSlugAvailable(slug, current.user.id);
  if (!available) {
    return redirectApp("/dashboard/profile?error=slug_taken", request);
  }

  const profile = await applySellerProfile(current.user.id, {
    storeName: payload.storeName,
    storeSlug: slug,
    description: payload.description ?? null
  });

  if (profile) {
    await logActivity({
      actorId: current.user.id,
      action: "seller.applied",
      entityType: "seller_profile",
      entityId: profile.id,
      metadata: { storeName: payload.storeName, storeSlug: slug }
    });
  }

  return redirectApp("/dashboard/profile?seller=applied", request);
}
