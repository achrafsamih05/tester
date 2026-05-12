"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon, ICONS } from "@/components/ui/Icon";
import { apiSend } from "@/lib/client/api";
import { useCategories, useProducts } from "@/lib/client/hooks";
import { useI18n } from "@/lib/useI18n";
import { cn } from "@/lib/utils";

// Curated subset of icons that make sense for categories. We keep the list
// short on purpose so the admin picks from known-good options — any string
// is still accepted by the API, but the dropdown nudges toward consistency.
const CATEGORY_ICON_OPTIONS: Array<keyof typeof ICONS> = [
  "LayoutGrid",
  "Cpu",
  "Smartphone",
  "Wrench",
  "Sofa",
  "Shirt",
  "Dumbbell",
  "ShoppingBag",
  "Package",
  "Boxes",
  "Star",
];

interface Draft {
  nameEn: string;
  nameAr: string;
  nameFr: string;
  slug: string;
  icon: string;
}

const EMPTY_DRAFT: Draft = {
  nameEn: "",
  nameAr: "",
  nameFr: "",
  slug: "",
  icon: "LayoutGrid",
};

// Mirror of api/categories POST logic so the modal can show live slug
// suggestions; the server stays the source of truth for validation.
function slugify(v: string): string {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoriesAdminPage() {
  const { t, locale } = useI18n();
  const categories = useCategories();
  const { data: products } = useProducts();
  const [modalOpen, setModalOpen] = useState(false);

  // How many products sit in each category — surfaced in the list and also
  // used to warn before deletion.
  const productCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + 1);
    }
    return map;
  }, [products]);

  async function remove(id: string, name: string) {
    const count = productCountByCategory.get(id) ?? 0;
    const warn =
      count > 0
        ? ` ${count} product${count === 1 ? "" : "s"} currently use it.`
        : "";
    // Task 3 explicitly asks for a confirmation prompt before delete.
    if (!confirm(`Delete category "${name}"?${warn}`)) return;
    try {
      await apiSend(`/api/categories/${id}`, "DELETE");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("admin.categories")}
            </h1>
            <p className="text-sm text-ink-500">
              Curate the taxonomy that powers the storefront navigation.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800"
          >
            <Icon name="Plus" size={16} />
            Add Category
          </button>
        </header>

        {/*
         * Responsive categories table (matches Task 2 spec for consistency).
         * Slug is the first column to be hidden on narrow screens; its value
         * is folded under the name on mobile so nothing is lost.
         */}
        <div className="overflow-x-auto shadow-md sm:rounded-lg bg-white border border-ink-100">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-ink-50 text-ink-600">
              <tr>
                <th className="px-4 py-3 text-start font-medium">Name</th>
                <th className="hidden px-4 py-3 text-start font-medium md:table-cell">
                  Slug
                </th>
                <th className="hidden px-4 py-3 text-start font-medium lg:table-cell">
                  Translations
                </th>
                <th className="px-4 py-3 text-end font-medium">Products</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {categories.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-ink-400"
                  >
                    No categories yet. Click{" "}
                    <button
                      onClick={() => setModalOpen(true)}
                      className="font-medium text-ink-700 underline"
                    >
                      Add Category
                    </button>{" "}
                    to create your first one.
                  </td>
                </tr>
              )}
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-700">
                        <Icon name={c.icon} size={18} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {c.name[locale]}
                        </div>
                        <div className="text-xs text-ink-500 md:hidden">
                          /{c.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-600 md:table-cell">
                    <code className="rounded bg-ink-50 px-1.5 py-0.5 text-xs">
                      {c.slug}
                    </code>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-ink-500 lg:table-cell">
                    <span className="me-2">EN: {c.name.en}</span>
                    <span className="me-2" dir="rtl">
                      AR: {c.name.ar}
                    </span>
                    <span>FR: {c.name.fr}</span>
                  </td>
                  <td className="px-4 py-3 text-end text-ink-600">
                    {productCountByCategory.get(c.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button
                      onClick={() => remove(c.id, c.name[locale])}
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete"
                    >
                      <Icon name="Trash2" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <AddCategoryModal onClose={() => setModalOpen(false)} />
      )}
    </AdminShell>
  );
}

// ---------------------------------------------------------------------------
// Add Category Modal — Task 3
// ---------------------------------------------------------------------------

function AddCategoryModal({ onClose }: { onClose: () => void }) {
  const [d, setD] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugPreview = d.slug || slugify(d.nameEn);

  async function submit() {
    setError(null);
    if (!d.nameEn.trim()) {
      setError("English name is required.");
      return;
    }
    const slug = slugify(d.slug || d.nameEn);
    if (!slug) {
      setError("Could not derive a valid slug from this name.");
      return;
    }
    setSaving(true);
    try {
      await apiSend("/api/categories", "POST", {
        slug,
        name: {
          en: d.nameEn.trim(),
          ar: d.nameAr.trim() || d.nameEn.trim(),
          fr: d.nameFr.trim() || d.nameEn.trim(),
        },
        icon: d.icon || "LayoutGrid",
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-lift">
        <header className="flex items-center justify-between border-b border-ink-100 p-4">
          <div>
            <h3 className="text-base font-semibold">Add category</h3>
            <p className="text-xs text-ink-500">
              Name is multilingual. The slug auto-derives from the English
              name; override it if you need a custom URL.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-600 hover:bg-ink-100"
            aria-label="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          <div className="space-y-3">
            <Field label="Name (EN)">
              <input
                autoFocus
                value={d.nameEn}
                onChange={(e) => setD({ ...d, nameEn: e.target.value })}
                placeholder="Electronics"
                className={inputCls}
              />
            </Field>
            <Field label="Name (AR)">
              <input
                value={d.nameAr}
                onChange={(e) => setD({ ...d, nameAr: e.target.value })}
                placeholder="إلكترونيات"
                dir="rtl"
                className={inputCls}
              />
            </Field>
            <Field label="Name (FR)">
              <input
                value={d.nameFr}
                onChange={(e) => setD({ ...d, nameFr: e.target.value })}
                placeholder="Électronique"
                className={inputCls}
              />
            </Field>
            <Field
              label="Slug"
              hint={slugPreview ? `Will resolve at /categories?c=${slugPreview}` : undefined}
            >
              <input
                value={d.slug}
                onChange={(e) => setD({ ...d, slug: slugify(e.target.value) })}
                placeholder="electronics"
                className={inputCls}
              />
            </Field>
            <Field label="Icon">
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink-200 bg-white text-ink-700">
                  <Icon name={d.icon} size={18} />
                </span>
                <select
                  value={d.icon}
                  onChange={(e) => setD({ ...d, icon: e.target.value })}
                  className={inputCls}
                >
                  {CATEGORY_ICON_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
          </div>
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
            <Icon name="Plus" size={16} />
            {saving ? "Creating…" : "Create category"}
          </button>
        </footer>
      </div>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm focus:border-ink-900 focus:outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block")}>
      <span className="mb-1 block text-xs font-medium text-ink-600">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] text-ink-500">{hint}</span>
      )}
    </label>
  );
}
