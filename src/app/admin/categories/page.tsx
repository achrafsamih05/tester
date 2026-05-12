"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon, ICONS } from "@/components/ui/Icon";
import { useCategories, useProducts } from "@/lib/client/hooks";
import { apiSend } from "@/lib/client/api";
import { useI18n } from "@/lib/useI18n";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// /admin/categories
//
// Lists every row in `public.categories` with its English, Arabic and French
// names, adds a modal to create a new category (all 3 langs + slug + icon),
// and supports deletion (the server surfaces Postgres FK errors cleanly when
// products still reference the category).
// ---------------------------------------------------------------------------

interface CategoryDraft {
  id?: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  icon: string;
}

const EMPTY_DRAFT: CategoryDraft = {
  slug: "",
  nameEn: "",
  nameAr: "",
  nameFr: "",
  icon: "LayoutGrid",
};

// A curated subset of our Icon registry that makes sense for categories.
// The admin can still type anything into the "icon" field — this list is
// just a quick-pick helper.
const ICON_SUGGESTIONS = [
  "LayoutGrid",
  "Cpu",
  "Smartphone",
  "Shirt",
  "Sofa",
  "Dumbbell",
  "Wrench",
  "Tag",
  "ShoppingBag",
  "Package",
];

export default function CategoriesAdminPage() {
  const { t } = useI18n();
  const categories = useCategories();
  const { data: products } = useProducts();
  const [editing, setEditing] = useState<CategoryDraft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Count how many products reference each category, so we can warn the
  // admin BEFORE they try to delete a non-empty category (which would be
  // rejected by the FK anyway — but a proactive warning is nicer UX).
  const productCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1);
    return m;
  }, [products]);

  async function save(d: CategoryDraft) {
    const payload = {
      slug: d.slug,
      name: { en: d.nameEn, ar: d.nameAr, fr: d.nameFr },
      icon: d.icon,
    };
    if (d.id) {
      await apiSend(`/api/categories/${d.id}`, "PATCH", payload);
    } else {
      await apiSend("/api/categories", "POST", payload);
    }
    setEditing(null);
  }

  async function remove(c: Category) {
    const count = productCount.get(c.id) ?? 0;
    const msg =
      count > 0
        ? `"${c.name.en}" has ${count} product(s) linked to it. ` +
          `Deletion will be rejected by the database. Continue anyway?`
        : `Delete category "${c.name.en}"?`;
    if (!confirm(msg)) return;

    setBusyId(c.id);
    try {
      await apiSend(`/api/categories/${c.id}`, "DELETE");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  function toDraft(c: Category): CategoryDraft {
    return {
      id: c.id,
      slug: c.slug,
      nameEn: c.name.en,
      nameAr: c.name.ar,
      nameFr: c.name.fr,
      icon: c.icon,
    };
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t("admin.categories")}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Categories power the storefront chips and the product filter.
              Add trilingual names (EN / AR / FR) so every locale sees a
              human-readable label.
            </p>
          </div>
          <button
            onClick={() => setEditing({ ...EMPTY_DRAFT })}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800"
          >
            <Icon name="Plus" size={16} />
            New category
          </button>
        </header>

        {categories.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
            No categories yet. Create your first one to start organising
            products.
          </div>
        )}

        {/* ----- MOBILE: card list ------------------------------------- */}
        <div className="grid gap-3 sm:hidden">
          {categories.map((c) => {
            const count = productCount.get(c.id) ?? 0;
            return (
              <article
                key={c.id}
                className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-3 shadow-soft"
              >
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-ink-100 text-ink-700">
                  <Icon name={c.icon} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{c.name.en}</div>
                      <div className="truncate text-xs text-ink-500">
                        {c.slug} · {count} product{count === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="flex flex-none gap-1">
                      <button
                        onClick={() => setEditing(toDraft(c))}
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-ink-100"
                        aria-label="Edit"
                      >
                        <Icon name="Edit" size={14} />
                      </button>
                      <button
                        onClick={() => remove(c)}
                        disabled={busyId === c.id}
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        aria-label="Delete"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <Loc label="EN" value={c.name.en} />
                    <Loc label="AR" value={c.name.ar} dir="rtl" />
                    <Loc label="FR" value={c.name.fr} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* ----- DESKTOP: table --------------------------------------- */}
        <div className="hidden overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft sm:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-ink-50 text-ink-600">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">Category</th>
                  <th className="px-4 py-3 text-start font-medium">Slug</th>
                  <th className="px-4 py-3 text-start font-medium">
                    Name (EN)
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    Name (AR)
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    Name (FR)
                  </th>
                  <th className="px-4 py-3 text-end font-medium">Products</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {categories.map((c) => {
                  const count = productCount.get(c.id) ?? 0;
                  return (
                    <tr key={c.id} className="hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-100 text-ink-700">
                            <Icon name={c.icon} size={16} />
                          </span>
                          <span className="font-medium">{c.name.en}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-600">{c.slug}</td>
                      <td className="px-4 py-3 text-ink-600">{c.name.en}</td>
                      <td
                        className="px-4 py-3 text-ink-600"
                        dir="rtl"
                      >
                        {c.name.ar}
                      </td>
                      <td className="px-4 py-3 text-ink-600">{c.name.fr}</td>
                      <td className="px-4 py-3 text-end">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            count === 0
                              ? "bg-ink-100 text-ink-700"
                              : "bg-brand-50 text-brand-700"
                          )}
                        >
                          {count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => setEditing(toDraft(c))}
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-ink-100"
                            aria-label="Edit"
                          >
                            <Icon name="Edit" size={16} />
                          </button>
                          <button
                            onClick={() => remove(c)}
                            disabled={busyId === c.id}
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            aria-label="Delete"
                          >
                            <Icon name="Trash2" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <CategoryEditor
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </AdminShell>
  );
}

// ---------------------------------------------------------------------------
// Create / edit modal
// ---------------------------------------------------------------------------

function CategoryEditor({
  draft,
  onClose,
  onSave,
}: {
  draft: CategoryDraft;
  onClose: () => void;
  onSave: (d: CategoryDraft) => Promise<void>;
}) {
  const [d, setD] = useState<CategoryDraft>(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-derive the slug from the EN name on creation — the admin can still
  // override it manually. On edit we leave the slug alone so existing product
  // references stay intact.
  function setEn(v: string) {
    setD((prev) => {
      if (prev.id) return { ...prev, nameEn: v };
      const auto = slugify(v);
      const shouldSync =
        !prev.slug || prev.slug === slugify(prev.nameEn);
      return {
        ...prev,
        nameEn: v,
        slug: shouldSync ? auto : prev.slug,
      };
    });
  }

  async function submit() {
    setError(null);
    const slug = d.slug.trim();
    if (!d.nameEn.trim()) return setError("Name (EN) is required.");
    if (!slug) return setError("Slug is required.");
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return setError("Slug can only contain lowercase letters, digits and '-'.");
    }

    setSaving(true);
    try {
      await onSave(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-lift">
        <header className="flex items-center justify-between border-b border-ink-100 p-4">
          <h3 className="text-base font-semibold">
            {d.id ? "Edit category" : "New category"}
          </h3>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-600 hover:bg-ink-100"
            aria-label="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <L label="Name (EN)">
              <input
                value={d.nameEn}
                onChange={(e) => setEn(e.target.value)}
                className={inputCls}
                placeholder="Electronics"
                autoFocus
              />
            </L>
            <L label="Slug">
              <input
                value={d.slug}
                onChange={(e) =>
                  setD({ ...d, slug: e.target.value.toLowerCase() })
                }
                className={inputCls}
                placeholder="electronics"
                disabled={!!d.id}
              />
              {d.id && (
                <span className="mt-1 block text-[11px] text-ink-500">
                  Slug can&apos;t be changed after creation — products reference it.
                </span>
              )}
            </L>
            <L label="Name (AR)">
              <input
                value={d.nameAr}
                onChange={(e) => setD({ ...d, nameAr: e.target.value })}
                className={inputCls}
                dir="rtl"
                placeholder="الإلكترونيات"
              />
            </L>
            <L label="Name (FR)">
              <input
                value={d.nameFr}
                onChange={(e) => setD({ ...d, nameFr: e.target.value })}
                className={inputCls}
                placeholder="Électronique"
              />
            </L>
          </div>

          <L label="Icon">
            <div className="space-y-2">
              <input
                value={d.icon}
                onChange={(e) => setD({ ...d, icon: e.target.value })}
                className={inputCls}
                placeholder="LayoutGrid"
              />
              <div className="flex flex-wrap gap-1.5">
                {ICON_SUGGESTIONS.map((name) => {
                  const active = d.icon === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setD({ ...d, icon: name })}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition",
                        active
                          ? "border-ink-900 bg-ink-900 text-white"
                          : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
                      )}
                    >
                      <Icon name={name} size={12} />
                      {name}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-ink-500">
                Any name from our Lucide icon registry works. Unknown names
                fall back to the grid glyph.
                {ICONS[d.icon] ? null : (
                  <span className="ms-1 text-amber-600">
                    &ldquo;{d.icon}&rdquo; isn&apos;t a known icon — it will fall back.
                  </span>
                )}
              </p>
            </div>
          </L>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-ink-100 p-4">
          <button
            onClick={onClose}
            className="h-10 rounded-xl border border-ink-200 bg-white px-4 text-sm font-medium text-ink-700 hover:border-ink-300"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-60"
          >
            <Icon name="Save" size={16} />
            {saving ? "Saving…" : "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const inputCls =
  "h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm focus:border-ink-900 focus:outline-none disabled:bg-ink-50";

function L({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function Loc({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div className="rounded-lg bg-ink-50 p-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </div>
      <div className="truncate text-xs text-ink-700" dir={dir}>
        {value || "—"}
      </div>
    </div>
  );
}
