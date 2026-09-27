import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { marketplaceSettings, sellerProfiles } from "@/db/schema";

export async function findSellerProfileByUserId(userId: number | string) {
  const db = getDb();
  const [profile] = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, Number(userId))).limit(1);
  return profile ?? null;
}

export async function ensureSellerProfile(userId: number | string, storeName: string, storeSlug: string) {
  const db = getDb();
  const existing = await findSellerProfileByUserId(userId);
  if (existing) return existing;

  const id = `SEL-${Date.now().toString(36).toUpperCase()}`;
  const [profile] = await db
    .insert(sellerProfiles)
    .values({
      id,
      userId: Number(userId),
      storeName,
      storeSlug,
      status: "approved"
    })
    .returning();

  return profile;
}

export async function listSellerProfiles() {
  const db = getDb();
  return db.select().from(sellerProfiles);
}

export async function findApprovedSellerProfileByUserId(userId: number | string) {
  const profile = await findSellerProfileByUserId(userId);
  return profile?.status === "approved" ? profile : null;
}

export async function getMarketplaceSettings() {
  const db = getDb();
  const [settings] = await db.select().from(marketplaceSettings).limit(1);
  return settings ?? null;
}

export async function updateMarketplaceSettings(input: {
  appName: string;
  supportEmail?: string | null;
  announcement?: string | null;
  checkoutEnabled: boolean;
}) {
  const db = getDb();
  const existing = await getMarketplaceSettings();

  if (!existing) {
    const [settings] = await db
      .insert(marketplaceSettings)
      .values({
        id: "default",
        appName: input.appName,
        supportEmail: input.supportEmail ?? null,
        announcement: input.announcement ?? null,
        checkoutEnabled: input.checkoutEnabled
      })
      .returning();
    return settings ?? null;
  }

  const [settings] = await db
    .update(marketplaceSettings)
    .set({
      appName: input.appName,
      supportEmail: input.supportEmail ?? null,
      announcement: input.announcement ?? null,
      checkoutEnabled: input.checkoutEnabled,
      updatedAt: new Date()
    })
    .where(eq(marketplaceSettings.id, existing.id))
    .returning();

  return settings ?? null;
}

export async function applySellerProfile(
  userId: number | string,
  input: { storeName: string; storeSlug: string; description?: string | null }
) {
  const db = getDb();
  const existing = await findSellerProfileByUserId(userId);

  if (!existing) {
    const id = `SEL-${Date.now().toString(36).toUpperCase()}`;
    const [profile] = await db
      .insert(sellerProfiles)
      .values({
        id,
        userId: Number(userId),
        storeName: input.storeName,
        storeSlug: input.storeSlug,
        description: input.description ?? null,
        status: "pending"
      })
      .returning();
    return profile ?? null;
  }

  const [profile] = await db
    .update(sellerProfiles)
    .set({
      storeName: input.storeName,
      storeSlug: input.storeSlug,
      description: input.description ?? null,
      status: "pending",
      updatedAt: new Date()
    })
    .where(eq(sellerProfiles.id, existing.id))
    .returning();

  return profile ?? null;
}

export async function updateSellerProfileByUserId(
  userId: number | string,
  input: { storeName: string; storeSlug: string; description?: string | null }
) {
  const db = getDb();
  const [profile] = await db
    .update(sellerProfiles)
    .set({
      storeName: input.storeName,
      storeSlug: input.storeSlug,
      description: input.description ?? null,
      updatedAt: new Date()
    })
    .where(eq(sellerProfiles.userId, Number(userId)))
    .returning();

  return profile ?? null;
}

export const updateSellerProfile = updateSellerProfileByUserId;

export async function isStoreSlugAvailable(storeSlug: string, currentUserId?: number | string) {
  const db = getDb();
  const filters = [eq(sellerProfiles.storeSlug, storeSlug)];
  if (currentUserId) {
    filters.push(ne(sellerProfiles.userId, Number(currentUserId)));
  }

  const [existing] = await db
    .select({ id: sellerProfiles.id })
    .from(sellerProfiles)
    .where(and(...filters))
    .limit(1);

  return !existing;
}
