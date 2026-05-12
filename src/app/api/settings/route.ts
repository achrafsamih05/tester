import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/server/db";
import { emit } from "@/lib/server/bus";
import type { Settings } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/settings — must be public so the storefront can read storeName,
// currency, etc. Middleware gates /api/settings/* by default, but this
// specific route is allowed via a small exception below the matcher. Since
// Next middleware matchers don't support per-method, we do the admin check
// per-verb here and let GET through for everyone.
export async function GET() {
  return NextResponse.json({ data: await getSettings() });
}

// PATCH /api/settings — admin only. Enforced here (not via middleware) so
// GET can remain public for the storefront.
export async function PATCH(req: NextRequest) {
  const { getCurrentUser } = await import("@/lib/server/auth");
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<Settings>;
  const patch: Partial<Settings> = {};
  if (typeof body.storeName === "string" && body.storeName.trim()) {
    patch.storeName = body.storeName.trim().slice(0, 64);
  }
  if (typeof body.currency === "string" && body.currency.trim()) {
    patch.currency = body.currency.trim().toUpperCase().slice(0, 8);
  }
  if (typeof body.taxRate === "number" && body.taxRate >= 0 && body.taxRate <= 100) {
    patch.taxRate = body.taxRate;
  }
  if (
    typeof body.lowStockThreshold === "number" &&
    body.lowStockThreshold >= 0 &&
    body.lowStockThreshold <= 10_000
  ) {
    patch.lowStockThreshold = body.lowStockThreshold;
  }
  const updated = await updateSettings(patch);
  emit({ channel: "settings", action: "updated" });
  return NextResponse.json({ data: updated });
}
