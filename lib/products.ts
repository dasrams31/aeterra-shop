import { and, desc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, productStocks, products } from "@/db/schema";

export async function listMarketplaceProducts(search = "", category = "") {
  const db = getDb();
  const query = search.trim();
  const categorySlug = category.trim();
  const filters = [or(eq(products.status, "active"), eq(products.isActive, true))!];

  if (query) {
    filters.push(or(ilike(products.name, `%${query}%`), ilike(products.description, `%${query}%`), ilike(categories.name, `%${query}%`))!);
  }

  if (categorySlug) {
    filters.push(eq(categories.slug, categorySlug));
  }

  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      resellerPrice: products.resellerPrice,
      fulfillmentType: products.fulfillmentType,
      status: products.status,
      isCustomPackage: products.isCustomPackage,
      description: products.description,
      categoryName: categories.name,
      categorySlug: categories.slug
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...filters))
    .orderBy(desc(products.createdAt));
}

export async function listCategories() {
  const db = getDb();
  return db.select({ name: categories.name, slug: categories.slug }).from(categories).orderBy(categories.name);
}

export async function getProductBySlug(slug: string) {
  const db = getDb();
  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      instructions: products.instructions,
      price: products.price,
      resellerPrice: products.resellerPrice,
      fulfillmentType: products.fulfillmentType,
      status: products.status,
      isCustomPackage: products.isCustomPackage,
      categoryName: categories.name,
      categorySlug: categories.slug
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1);

  return product ?? null;
}

export async function listProductsBySellerId(sellerId: string | null) {
  const db = getDb();
  const base = db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      resellerPrice: products.resellerPrice,
      fulfillmentType: products.fulfillmentType,
      status: products.status,
      isCustomPackage: products.isCustomPackage,
      createdAt: products.createdAt
    })
    .from(products);

  return sellerId ? base.where(eq(products.sellerId, sellerId)).orderBy(desc(products.createdAt)) : base.orderBy(desc(products.createdAt));
}

export async function listCustomPackages() {
  const db = getDb();

  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      status: products.status,
      fulfillmentType: products.fulfillmentType,
      createdAt: products.createdAt
    })
    .from(products)
    .where(eq(products.isCustomPackage, true))
    .orderBy(desc(products.createdAt));
}

export async function countAvailableStock(productId: number | string) {
  const db = getDb();
  const rows = await db
    .select({ id: productStocks.id })
    .from(productStocks)
    .where(and(eq(productStocks.productId, Number(productId)), eq(productStocks.isSold, false)));

  return rows.length;
}

export async function listStocksBySellerId(sellerId: string | null) {
  const db = getDb();
  const base = db
    .select({
      id: productStocks.id,
      productId: productStocks.productId,
      productName: products.name,
      content: productStocks.content,
      isSold: productStocks.isSold,
      createdAt: productStocks.createdAt,
      soldAt: productStocks.soldAt
    })
    .from(productStocks)
    .innerJoin(products, eq(productStocks.productId, products.id));

  const rows = await (sellerId ? base.where(eq(products.sellerId, sellerId)).orderBy(desc(productStocks.createdAt)) : base.orderBy(desc(productStocks.createdAt)));
  return rows.map((r) => ({
    ...r,
    status: r.isSold ? "sold" : "available"
  }));
}
