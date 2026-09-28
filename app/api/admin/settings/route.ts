import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session-server";
import { updateMarketplaceSettings } from "@/lib/sellers";
import { logActivity } from "@/lib/activity";
import { redirectApp } from "@/lib/redirect";

const settingsSchema = z.object({
  appName: z.string().min(3).max(80),
  supportEmail: z.string().email().optional().or(z.literal("")),
  announcement: z.string().max(500).optional(),
  checkoutEnabled: z.coerce.boolean().optional()
});

export async function POST(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current || current.session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const payload = settingsSchema.parse({
    appName: form.get("appName"),
    supportEmail: form.get("supportEmail") || undefined,
    announcement: form.get("announcement") || undefined,
    checkoutEnabled: form.get("checkoutEnabled") === "on"
  });

  const settings = await updateMarketplaceSettings({
    appName: payload.appName,
    supportEmail: payload.supportEmail || null,
    announcement: payload.announcement || null,
    checkoutEnabled: payload.checkoutEnabled ?? true
  });

  await logActivity({ actorId: current.user.id, action: "marketplace.settings_updated", entityType: "marketplace_settings", entityId: settings?.id ?? "default" });
  return redirectApp("/admin/settings?updated=1", request);
}
