import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { blogPosts } from "@/db/schema";
import { getCurrentUser } from "@/lib/session-server";
import { slugify } from "@/lib/slug";
import { redirectApp } from "@/lib/redirect";

const articleSchema = z.object({
  title: z.string().min(3),
  excerpt: z.string().min(10),
  content: z.string().min(20),
  status: z.enum(["draft", "published", "archived"])
});

export async function POST(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current || current.session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const payload = articleSchema.parse({
    title: form.get("title"),
    excerpt: form.get("excerpt"),
    content: form.get("content"),
    status: form.get("status")
  });

  const slug = `${slugify(payload.title)}-${Math.random().toString(36).slice(2, 6)}`;
  const db = getDb();

  await db.insert(blogPosts).values({
    authorId: current.user.id,
    title: payload.title,
    slug,
    excerpt: payload.excerpt,
    content: payload.content,
    status: payload.status,
    publishedAt: payload.status === "published" ? new Date() : null
  });

  return redirectApp("/admin/blog", request);
}
