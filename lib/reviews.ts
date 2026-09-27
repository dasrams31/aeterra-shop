import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products, reviews, users } from "@/db/schema";

export async function getReviewByOrderItemId(orderItemId: number | string) {
  const db = getDb();
  const [review] = await db.select().from(reviews).where(eq(reviews.orderItemId, Number(orderItemId))).limit(1);
  return review ?? null;
}

export async function getReviewByTransactionId(transactionId: string) {
  const db = getDb();
  const [review] = await db.select().from(reviews).where(eq(reviews.transactionId, transactionId)).limit(1);
  return review ?? null;
}

export async function listAdminReviews() {
  const db = getDb();
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      isHidden: reviews.isHidden,
      isPostedToChannel: reviews.isPostedToChannel,
      createdAt: reviews.createdAt,
      buyerName: users.name,
      productName: products.name,
      productSlug: products.slug
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.buyerId, users.id))
    .innerJoin(products, eq(reviews.productId, products.id))
    .orderBy(desc(reviews.createdAt));
}

export async function listReviewsBySellerId(sellerId: string | null) {
  const db = getDb();
  const base = db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      isHidden: reviews.isHidden,
      isPostedToChannel: reviews.isPostedToChannel,
      createdAt: reviews.createdAt,
      buyerName: users.name,
      productName: products.name,
      productSlug: products.slug
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.buyerId, users.id))
    .innerJoin(products, eq(reviews.productId, products.id));

  return sellerId ? base.where(eq(products.sellerId, sellerId)).orderBy(desc(reviews.createdAt)) : base.orderBy(desc(reviews.createdAt));
}

export async function hideReview(reviewId: number | string, hidden: boolean) {
  const db = getDb();
  await db.update(reviews).set({ isHidden: hidden, updatedAt: new Date() }).where(eq(reviews.id, Number(reviewId)));
}

export async function listReviewsByProductId(productId: number | string, limit = 3) {
  const db = getDb();

  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      buyerName: users.name
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.buyerId, users.id))
    .where(and(eq(reviews.productId, Number(productId)), eq(reviews.isHidden, false)))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

export async function getReviewSummaryByProductId(productId: number | string) {
  const db = getDb();
  const rows = await db
    .select({ rating: reviews.rating })
    .from(reviews)
    .where(and(eq(reviews.productId, Number(productId)), eq(reviews.isHidden, false)));
  const count = rows.length;
  const average = count === 0 ? 0 : rows.reduce((total, row) => total + row.rating, 0) / count;

  return { count, average };
}

export async function getGlobalReviewSummary() {
  const db = getDb();
  const rows = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.isHidden, false));
  const count = rows.length;
  const average = count === 0 ? 0 : rows.reduce((total, row) => total + row.rating, 0) / count;

  return { count, average };
}

export async function listTopRatedProducts(limit = 3) {
  const db = getDb();

  const rows = await db
    .select({
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      reviewId: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      buyerName: users.name
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .innerJoin(users, eq(reviews.buyerId, users.id))
    .where(eq(reviews.isHidden, false))
    .orderBy(desc(reviews.createdAt));

  const grouped = new Map<number, {
    productId: number;
    productName: string;
    productSlug: string;
    totalRating: number;
    reviewCount: number;
    latestReview: { buyerName: string; rating: number; comment: string | null } | null;
  }>();

  for (const row of rows) {
    const current = grouped.get(row.productId) ?? {
      productId: row.productId,
      productName: row.productName,
      productSlug: row.productSlug,
      totalRating: 0,
      reviewCount: 0,
      latestReview: null
    };

    current.totalRating += row.rating;
    current.reviewCount += 1;
    if (!current.latestReview) {
      current.latestReview = {
        buyerName: row.buyerName,
        rating: row.rating,
        comment: row.comment ?? null
      };
    }

    grouped.set(row.productId, current);
  }

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      averageRating: item.reviewCount === 0 ? 0 : item.totalRating / item.reviewCount
    }))
    .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
    .slice(0, limit);
}

export async function createReview(input: {
  productId: number | string;
  orderItemId?: number | string | null;
  transactionId?: string | null;
  buyerId: number | string;
  rating: number;
  comment?: string | null;
}) {
  const db = getDb();
  const [review] = await db
    .insert(reviews)
    .values({
      productId: Number(input.productId),
      orderItemId: input.orderItemId ? Number(input.orderItemId) : null,
      transactionId: input.transactionId ?? `TRX-${Date.now()}`,
      buyerId: Number(input.buyerId),
      rating: input.rating,
      comment: input.comment ?? null
    })
    .returning();

  return review ?? null;
}
