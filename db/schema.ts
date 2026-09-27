import { bigint, boolean, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    username: text("username"),
    firstName: text("first_name"),
    name: text("name").notNull(),
    email: text("email"),
    passwordHash: text("password_hash"),
    role: text("role").$type<"buyer" | "seller" | "admin">().notNull().default("buyer"),
    isAdmin: boolean("is_admin").notNull().default(false),
    balance: numeric("balance").$type<number>().notNull().default("0" as any),
    referralBalance: numeric("referral_balance").$type<number>().notNull().default("0" as any),
    totalReferrals: integer("total_referrals").notNull().default(0),
    referredBy: bigint("referred_by", { mode: "number" }),
    isReseller: boolean("is_reseller").notNull().default(false),
    resellerStatus: text("reseller_status").$type<"none" | "pending" | "approved" | "rejected">().notNull().default("none"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    usernameIdx: index("users_username_idx").on(table.username)
  })
);

export const sellerProfiles = pgTable(
  "seller_profiles",
  {
    id: text("id").primaryKey(),
    userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
    storeName: text("store_name").notNull(),
    storeSlug: text("store_slug").notNull().unique(),
    description: text("description"),
    status: text("status").$type<"pending" | "approved" | "suspended" | "rejected">().notNull().default("approved"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdx: index("seller_profiles_user_idx").on(table.userId),
    slugIdx: uniqueIndex("seller_profiles_slug_idx").on(table.storeSlug)
  })
);

export const marketplaceSettings = pgTable("marketplace_settings", {
  id: text("id").primaryKey().default("default"),
  appName: text("app_name").notNull().default("Aeternum Shop"),
  supportEmail: text("support_email"),
  announcement: text("announcement"),
  checkoutEnabled: boolean("checkout_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    slugIdx: uniqueIndex("categories_slug_idx").on(table.slug)
  })
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    sellerId: text("seller_id"),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    instructions: text("instructions"),
    price: numeric("price").$type<number>().notNull(),
    resellerPrice: numeric("reseller_price").$type<number>(),
    productType: text("product_type").default("TEXT_STOCK"),
    durationDays: integer("duration_days").default(30),
    fulfillmentType: text("fulfillment_type").$type<"auto" | "manual">().notNull().default("auto"),
    status: text("status").$type<"draft" | "active" | "inactive" | "blocked">().notNull().default("active"),
    isActive: boolean("is_active").notNull().default(true),
    isCustomPackage: boolean("is_custom_package").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    slugIdx: uniqueIndex("products_slug_idx").on(table.slug),
    statusIdx: index("products_status_idx").on(table.status),
    categoryIdx: index("products_category_idx").on(table.categoryId)
  })
);

export const productStocks = pgTable(
  "product_items",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isSold: boolean("is_sold").notNull().default(false),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    transactionId: text("transaction_id"),
    reservedByTrx: text("reserved_by_trx"),
    reservedUntil: timestamp("reserved_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    productIdx: index("product_stocks_product_idx").on(table.productId),
    soldIdx: index("product_stocks_sold_idx").on(table.isSold)
  })
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    buyerId: bigint("buyer_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
    orderNumber: text("order_number").notNull().unique(),
    status: text("status").$type<"pending_payment" | "paid" | "processing" | "delivered" | "cancelled" | "refunded" | "failed">().notNull().default("pending_payment"),
    totalAmount: numeric("total_amount").$type<number>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true })
  },
  (table) => ({
    numberIdx: uniqueIndex("orders_number_idx").on(table.orderNumber),
    buyerIdx: index("orders_buyer_idx").on(table.buyerId),
    statusIdx: index("orders_status_idx").on(table.status)
  })
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
    sellerId: text("seller_id"),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: numeric("unit_price").$type<number>().notNull(),
    fulfillmentType: text("fulfillment_type").$type<"auto" | "manual">().notNull().default("auto"),
    deliveryContent: jsonb("delivery_content"),
    deliveryStatus: text("delivery_status").$type<"pending" | "processing" | "delivered" | "failed">().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true })
  },
  (table) => ({
    orderIdx: index("order_items_order_idx").on(table.orderId),
    productIdx: index("order_items_product_idx").on(table.productId)
  })
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("klikqris"),
    providerReference: text("provider_reference"),
    paymentUrl: text("payment_url"),
    qrisImage: text("qris_image"),
    amount: numeric("amount").$type<number>().notNull(),
    status: text("status").$type<"pending" | "paid" | "failed" | "expired" | "refunded">().notNull().default("pending"),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    orderIdx: index("payments_order_idx").on(table.orderId),
    referenceIdx: index("payments_reference_idx").on(table.providerReference)
  })
);

export const paymentEvents = pgTable("payment_events", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").references(() => payments.id, { onDelete: "cascade" }),
  transactionId: text("transaction_id"),
  provider: text("provider").notNull(),
  eventType: text("event_type"),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    orderItemId: integer("order_item_id").references(() => orderItems.id, { onDelete: "set null" }),
    transactionId: text("transaction_id"),
    buyerId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    isHidden: boolean("is_hidden").notNull().default(false),
    isPostedToChannel: boolean("is_posted_to_channel").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    productIdx: index("reviews_product_idx").on(table.productId)
  })
);

export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    buyerId: bigint("buyer_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    sellerId: text("seller_id"),
    subject: text("subject").notNull(),
    status: text("status").$type<"open" | "pending" | "closed">().notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true })
  },
  (table) => ({
    buyerIdx: index("tickets_buyer_idx").on(table.buyerId),
    statusIdx: index("tickets_status_idx").on(table.status)
  })
);

export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  senderId: bigint("sender_user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const sellerWithdrawalRequests = pgTable(
  "seller_withdrawal_requests",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id").notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
    ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    amount: numeric("amount").$type<number>().notNull(),
    status: text("status").$type<"requested" | "approved" | "paid" | "rejected">().notNull().default("requested"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true })
  },
  (table) => ({
    sellerIdx: index("seller_withdrawal_requests_seller_idx").on(table.sellerId),
    statusIdx: index("seller_withdrawal_requests_status_idx").on(table.status)
  })
);

export const sellerWalletTransactions = pgTable(
  "seller_wallet_transactions",
  {
    id: serial("id").primaryKey(),
    sellerId: text("seller_id").notNull(),
    orderItemId: integer("order_item_id").references(() => orderItems.id, { onDelete: "set null" }),
    withdrawalRequestId: text("withdrawal_request_id").references(() => sellerWithdrawalRequests.id, { onDelete: "set null" }),
    type: text("type").$type<"credit" | "debit" | "adjustment">().notNull(),
    grossAmount: numeric("gross_amount").$type<number>().notNull().default(0 as any),
    platformFee: numeric("platform_fee").$type<number>().notNull().default(0 as any),
    netAmount: numeric("net_amount").$type<number>().notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    sellerIdx: index("seller_wallet_transactions_seller_idx").on(table.sellerId),
    typeIdx: index("seller_wallet_transactions_type_idx").on(table.type)
  })
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    authorId: bigint("author_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    excerpt: text("excerpt"),
    content: text("content").notNull(),
    status: text("status").$type<"draft" | "published" | "archived">().notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    slugIdx: uniqueIndex("blog_posts_slug_idx").on(table.slug),
    statusIdx: index("blog_posts_status_idx").on(table.status)
  })
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    actorId: bigint("actor_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    actorIdx: index("activity_logs_actor_idx").on(table.actorId),
    actionIdx: index("activity_logs_action_idx").on(table.action),
    createdIdx: index("activity_logs_created_idx").on(table.createdAt)
  })
);

export const faqItems = pgTable("faq_items", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
