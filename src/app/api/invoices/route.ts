import { NextResponse } from "next/server";
import { listInvoices } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// GET /api/invoices — admin only.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ data: await listInvoices() });
}
