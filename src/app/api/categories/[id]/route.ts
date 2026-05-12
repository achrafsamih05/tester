import { NextRequest } from "next/server";
import {
  deleteCategory,
  getCategory,
  updateCategory,
} from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { emit } from "@/lib/server/bus";
import { handle, httpError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// GET /api/categories/:id — public.
export const GET = (
  _: NextRequest,
  { params }: { params: { id: string } }
) =>
  handle(async () => {
    const c = await getCategory(params.id);
    if (!c) httpError(404, "Not found");
    return c;
  });

// PATCH /api/categories/:id — admin only.
export const PATCH = (
  req: NextRequest,
  { params }: { params: { id: string } }
) =>
  handle(async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") httpError(401, "Unauthorized");
    const body = await req.json();
    const updated = await updateCategory(params.id, body);
    if (!updated) httpError(404, "Not found");
    emit({ channel: "categories", action: "updated", id: params.id });
    return updated;
  });

// DELETE /api/categories/:id — admin only.
//
// The FK on public.products.category_id is ON DELETE RESTRICT. If any
// product still references this category, Supabase returns Postgres error
// code 23503 (foreign_key_violation), which raise() surfaces verbatim so
// the admin sees an actionable error like:
//   "deleteCategory failed — update or delete on table \"categories\" ...
//    violates foreign key constraint ... (code 23503)".
export const DELETE = (
  _: NextRequest,
  { params }: { params: { id: string } }
) =>
  handle(async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") httpError(401, "Unauthorized");
    const removed = await deleteCategory(params.id);
    if (!removed) httpError(404, "Not found");
    emit({ channel: "categories", action: "deleted", id: params.id });
    return removed;
  });
