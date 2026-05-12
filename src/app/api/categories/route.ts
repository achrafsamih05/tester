import { NextRequest } from "next/server";
import {
  categoryIdForSlug,
  createCategory,
  listCategories,
} from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { emit } from "@/lib/server/bus";
import { handle, httpError } from "@/lib/server/http";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/categories — public read used by storefront + admin UIs.
export const GET = () => handle(() => listCategories());

// POST /api/categories — admin only.
// Body: { slug, name: {en, ar, fr}, icon }
// id is derived from the slug ("c-<slug>") so it stays consistent with the
// existing seed rows and product.categoryId references.
export const POST = (req: NextRequest) =>
  handle(async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") httpError(401, "Unauthorized");

    const body = (await req.json().catch(() => ({}))) as Partial<Category>;

    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug) httpError(400, "slug is required");
    if (!body.name || !body.name.en) {
      httpError(400, "name.en is required");
    }

    const id = categoryIdForSlug(slug);
    const fallbackName = body.name.en;

    const category: Category = {
      id,
      slug,
      name: {
        en: body.name.en,
        // If ar / fr are blank, fall back to EN so the storefront always has
        // something to render in every locale.
        ar: body.name.ar?.trim() || fallbackName,
        fr: body.name.fr?.trim() || fallbackName,
      },
      icon: (body.icon && body.icon.trim()) || "LayoutGrid",
    };

    const created = await createCategory(category);
    emit({ channel: "categories", action: "created", id: created.id });
    return created;
  });
