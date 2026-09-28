import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hideReview } from "@/lib/reviews";
import { getCurrentUser } from "@/lib/session-server";
import { logActivity } from "@/lib/activity";
import { redirectApp } from "@/lib/redirect";

const hideSchema = z.object({
  hidden: z.enum(["true", "false"])
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || current.session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const form = await request.formData();
  const payload = hideSchema.parse({ hidden: form.get("hidden") });

  await hideReview(id, payload.hidden === "true");
  await logActivity({
    actorId: current.user.id,
    action: payload.hidden === "true" ? "review.hidden" : "review.unhidden",
    entityType: "review",
    entityId: id,
    metadata: { hidden: payload.hidden === "true" }
  });

  return redirectApp("/admin/reviews", request);
}
