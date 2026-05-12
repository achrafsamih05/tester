import { NextResponse } from "next/server";
import { listCategories } from "@/lib/server/db";

// Always run at request time — no build-time prerender, which would need
// SUPABASE_URL at build to succeed.
export const dynamic = "force-dynamic";

// GET /api/categories — public
export async function GET() {
  return NextResponse.json({ data: await listCategories() });
}
