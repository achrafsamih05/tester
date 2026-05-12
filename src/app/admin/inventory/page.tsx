"use client";

import { useMemo, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";
import { useCategories, useProducts, useSettings } from "@/lib/client/hooks";
import { apiSend } from "@/lib/client/api";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/useI18n";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DraftProduct {
  id?: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  descEn: string;
  descAr: string;
  descFr: string;
  price: number;
  categoryId: string;
  stock: number;
  image: string;
}

export default function InventoryPage() {
  const { t, locale } = useI18n();
  const categories = useCategories();
  const { data: list, loading, reload } = useProducts();
  const settings = useSettings();
  const currency = settings?.currency ?? "USD";
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<DraftProduct | null>(null);

  const EMPTY_DRAFT: DraftProduct = {
    sku: "",
    nameEn: "",
    nameAr: "",
    nameFr: "",
    descEn: "",
    descAr: "",
    descFr: "",
    price: 0,
    categoryId: categories[0]?.id ?? "",
    stock: 0,
    image: "",
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      [p.sku, p.name.en, p.name.ar, p.name.fr].join(" ").toLowerCase().includes(q)
    );
  }, [list, query]);

  function toDraft(p: Product): DraftProduct {
    return {
      id: p.id,
      sku: p.sku,
      nameEn: p.name.en,
      nameAr: p.name.ar,
      nameFr: p.name.fr,
      descEn: p.description.en,
      descAr: p.description.ar,
      descFr: p.description.fr,
      price: p.price,
      categoryId: p.categoryId,
      stock: p.stock,
      image: p.image,
    };
  }

  async function save(d: DraftProduct) {
    const payload = {
      sku: d.sku,
      name: { en: d.nameEn, ar: d.nameAr, fr: d.nameFr },
      description: { en: d.descEn, ar: d.descAr, fr: d.descFr },
      price: Number(d.price),
      categoryId: d.categoryId,
      stock: Number(d.stock),
      image: d.image || "https://picsum.photos/seed/nova/800/800",
    };
    if (d.id) {
      await apiSend(`/api/products/${d.id}`, "PATCH", payload);
    } else {
      await apiSend("/api/products", "POST", payload);
    }
    setEditing(null);
    await reload();
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    await apiSend(`/api/products/${id}`, "DELETE");
    await reload();
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("admin.inventory")}
            </h1>
            <p className="text-sm text-ink-500">
              Manage your product catalog, stock and pricing. Changes propagate
              to the storefront in real time.
            </p>
          </div>
          <button
            onClick={() => setEditing({ ...EMPTY_DRAFT })}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800"
          >
            <Icon name="Plus" size={16} />
            New product
          </button>
        </header>

        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-ink-400">
            <Icon name="Search" size={16} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by SKU or name…"
            className="h-11 w-full rounded-xl border border-ink-200 bg-white ps-10 pe-4 text-sm focus:border-ink-900 focus:outline-none"
          />
        </div>

        {/*
         * Responsive table wrapper — exact spec from Task 2:
         *   - overflow-x-auto lets narrow screens scroll the table
         *     horizontally instead of squashing cells.
         *   - shadow-md + sm:rounded-lg gives the card treatment without
         *     clipping the horizontal scrollbar.
         *   - min-w-[800px] on the <table> keeps columns readable during
         *     horizontal scroll.
         *   - Non-essential columns (SKU, Category, Price) are hidden
         *     below md; only Product / Stock / actions remain on mobile.
         */}
        <div className="overflow-x-auto shadow-md sm:rounded-lg bg-white border border-ink-100">
          <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-ink-50 text-ink-600">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">Product</th>
                  <th className="hidden px-4 py-3 text-start font-medium md:table-cell">
                    SKU
                  </th>
                  <th className="hidden px-4 py-3 text-start font-medium lg:table-cell">
                    Category
                  </th>
                  <th className="hidden px-4 py-3 text-end font-medium md:table-cell">
                    Price
                  </th>
                  <th className="px-4 py-3 text-end font-medium">Stock</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-ink-400"
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-ink-400"
                    >
                      No products.
                    </td>
                  </tr>
                )}
                {filtered.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  return (
                    <tr key={p.id} className="hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {p.name[locale]}
                            </div>
                            {/* Mobile: fold SKU + price under the name. */}
                            <div className="mt-0.5 text-xs text-ink-500 md:hidden">
                              {p.sku} ·{" "}
                              {formatCurrency(p.price, locale, currency)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-ink-600 md:table-cell">
                        {p.sku}
                      </td>
                      <td className="hidden px-4 py-3 text-ink-600 lg:table-cell">
                        {cat?.name[locale] ?? "—"}
                      </td>
                      <td className="hidden px-4 py-3 text-end md:table-cell">
                        {formatCurrency(p.price, locale, currency)}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            p.stock <= 10
                              ? "bg-red-50 text-red-700"
                              : p.stock <= 25
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          )}
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => setEditing(toDraft(p))}
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-ink-100"
                            aria-label="Edit"
                          >
                            <Icon name="Edit" size={16} />
                          </button>
                          <button
                            onClick={() => remove(p.id)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-red-50 hover:text-red-600"
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

      {editing && (
        <ProductEditor
          draft={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </AdminShell>
  );
}

function ProductEditor({
  draft,
  categories,
  onClose,
  onSave,
}: {
  draft: DraftProduct;
  categories: ReturnType<typeof useCategories>;
  onClose: () => void;
  onSave: (d: DraftProduct) => Promise<void>;
}) {
  const [d, setD] = useState<DraftProduct>(draft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    setSaving(true);
    try {
      await onSave(d);
    } finally {
      setSaving(false);
    }
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => ({ error: "Invalid JSON" }));
      if (!res.ok) throw new Error(json.error ?? `Upload failed (${res.status})`);
      const url = (json.data as { url: string }).url;
      setD((prev) => ({ ...prev, image: url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Reset so selecting the same file twice still fires onChange.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-lift">
        <header className="flex items-center justify-between border-b border-ink-100 p-4">
          <h3 className="text-base font-semibold">
            {d.id ? "Edit product" : "New product"}
          </h3>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-600 hover:bg-ink-100"
            aria-label="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <L label="SKU">
              <input
                value={d.sku}
                onChange={(e) => setD({ ...d, sku: e.target.value })}
                className={inputCls}
              />
            </L>
            <L label="Category">
              <select
                value={d.categoryId}
                onChange={(e) => setD({ ...d, categoryId: e.target.value })}
                className={inputCls}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.en}
                  </option>
                ))}
              </select>
            </L>
            <L label="Price">
              <input
                type="number"
                step="0.01"
                value={d.price}
                onChange={(e) => setD({ ...d, price: Number(e.target.value) })}
                className={inputCls}
              />
            </L>
            <L label="Stock">
              <input
                type="number"
                value={d.stock}
                onChange={(e) => setD({ ...d, stock: Number(e.target.value) })}
                className={inputCls}
              />
            </L>

            {/*
             * Image upload (Task 1 — spec-compliant).
             *   - File input (accept=image/*) replaces the old URL text field.
             *   - On select, we POST to /api/upload which writes to the
             *     `product-images` Supabase Storage bucket and returns the
             *     direct public URL. That URL is stored on `d.image` and
             *     persisted on save, exactly like the previous URL string.
             *   - The preview uses a standard <img> (NOT next/image) with
             *     w-full h-48 object-cover per Task 1 guidance — this
             *     bypasses Next.js image optimization so a freshly-uploaded
             *     public URL displays immediately without a config reload.
             */}
            <L label="Product image" wide>
              <div className="space-y-3">
                {d.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.image}
                    alt="Product preview"
                    className="w-full h-48 object-cover rounded-xl border border-ink-200 bg-ink-50"
                  />
                ) : (
                  <div className="grid h-48 w-full place-items-center rounded-xl border border-dashed border-ink-200 bg-ink-50 text-ink-400">
                    <div className="flex flex-col items-center gap-1 text-xs">
                      <Icon name="Package" size={24} />
                      <span>No image selected</span>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileSelected}
                  disabled={uploading}
                  className={cn(
                    "block w-full text-sm text-ink-700",
                    "file:me-3 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-2",
                    "file:text-sm file:font-medium file:text-white hover:file:bg-ink-800",
                    "disabled:opacity-60"
                  )}
                />
                {uploading && (
                  <p className="text-xs text-ink-500">Uploading to Supabase Storage…</p>
                )}
                {uploadError && (
                  <p className="text-xs text-red-600">{uploadError}</p>
                )}
                {d.image && !uploading && (
                  <p className="truncate text-xs text-ink-500" title={d.image}>
                    {d.image}
                  </p>
                )}
              </div>
            </L>

            <L label="Name (EN)">
              <input
                value={d.nameEn}
                onChange={(e) => setD({ ...d, nameEn: e.target.value })}
                className={inputCls}
              />
            </L>
            <L label="Name (AR)">
              <input
                value={d.nameAr}
                onChange={(e) => setD({ ...d, nameAr: e.target.value })}
                className={inputCls}
                dir="rtl"
              />
            </L>
            <L label="Name (FR)" wide>
              <input
                value={d.nameFr}
                onChange={(e) => setD({ ...d, nameFr: e.target.value })}
                className={inputCls}
              />
            </L>
            <L label="Description (EN)" wide>
              <textarea
                value={d.descEn}
                onChange={(e) => setD({ ...d, descEn: e.target.value })}
                rows={2}
                className={inputCls}
              />
            </L>
            <L label="Description (AR)" wide>
              <textarea
                value={d.descAr}
                onChange={(e) => setD({ ...d, descAr: e.target.value })}
                rows={2}
                className={inputCls}
                dir="rtl"
              />
            </L>
            <L label="Description (FR)" wide>
              <textarea
                value={d.descFr}
                onChange={(e) => setD({ ...d, descFr: e.target.value })}
                rows={2}
                className={inputCls}
              />
            </L>
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
            disabled={saving || uploading}
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

const inputCls =
  "h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm focus:border-ink-900 focus:outline-none";

function L({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", wide && "md:col-span-2")}>
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}
