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
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t("admin.inventory")}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
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
          Desktop: traditional data-table.
          Mobile (< md): card list. The table is very wide — 6 columns with
          image + localized name + currency — so below `md` we render each
          product as a self-contained card instead of letting the table
          overflow and making the user scroll horizontally.
        */}

        {/* ----- MOBILE: card layout ------------------------------------ */}
        <div className="space-y-3 md:hidden">
          {loading && (
            <div className="rounded-2xl border border-ink-100 bg-white p-6 text-center text-ink-400 shadow-soft">
              Loading…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-6 text-center text-ink-400 shadow-soft">
              No products.
            </div>
          )}
          {filtered.map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId);
            return (
              <article
                key={p.id}
                className="flex gap-3 rounded-2xl border border-ink-100 bg-white p-3 shadow-soft"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt=""
                  className="h-20 w-20 flex-none rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold">
                      {p.name[locale]}
                    </h3>
                    <div className="flex flex-none gap-1">
                      <button
                        onClick={() => setEditing(toDraft(p))}
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-ink-100"
                        aria-label="Edit"
                      >
                        <Icon name="Edit" size={14} />
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-ink-500">
                    {p.sku} · {cat?.name[locale] ?? "—"}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-semibold">
                      {formatCurrency(p.price, locale, currency)}
                    </span>
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
                      {p.stock} in stock
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* ----- DESKTOP: table ----------------------------------------- */}
        <div className="hidden overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-ink-50 text-ink-600">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">Product</th>
                  <th className="px-4 py-3 text-start font-medium">SKU</th>
                  <th className="px-4 py-3 text-start font-medium">Category</th>
                  <th className="px-4 py-3 text-end font-medium">Price</th>
                  <th className="px-4 py-3 text-end font-medium">Stock</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ink-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ink-400">
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
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                          <span className="font-medium">{p.name[locale]}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-600">{p.sku}</td>
                      <td className="px-4 py-3 text-ink-600">
                        {cat?.name[locale] ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-end">
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

// ---------------------------------------------------------------------------
// Product editor modal
// ---------------------------------------------------------------------------

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

  async function submit() {
    setSaving(true);
    try {
      await onSave(d);
    } finally {
      setSaving(false);
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
            <L label="Product image" wide>
              <ImageUpload
                value={d.image}
                onChange={(url) => setD({ ...d, image: url })}
              />
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
// Image upload control
//
// Replaces the old text input. Selecting a file:
//   1. Shows an instant preview via URL.createObjectURL (no network round-trip)
//   2. Uploads to /api/upload which pushes to the Supabase Storage
//      `product-images` bucket with the service-role key.
//   3. Writes the returned public URL back to the draft so `image` in the
//      products table is a CDN URL you can use directly in <img src>.
//
// Manual URL entry is preserved as a fallback for power users (e.g. pasting
// a CDN URL from elsewhere) — the field below the dropzone.
// ---------------------------------------------------------------------------

function ImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Local preview (object URL) for the split second between "file picked" and
  // "server responded with CDN URL". This makes the UI feel instant.
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  // Best: show localPreview while uploading, then the real CDN url once saved.
  const preview = localPreview ?? (value || null);

  async function handleFile(file: File) {
    setError(null);
    // Instant preview while the file is in flight. We revoke the object URL
    // once we have the real CDN URL (or on next selection) to avoid leaks.
    if (localPreview) URL.revokeObjectURL(localPreview);
    const objUrl = URL.createObjectURL(file);
    setLocalPreview(objUrl);

    const form = new FormData();
    form.append("file", file);
    form.append("folder", "products");

    setUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { url: string };
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? `Upload failed (${res.status})`);
      }
      if (!json.data?.url) throw new Error("Upload returned no URL");
      onChange(json.data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = "";
  }

  function clear() {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    onChange("");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Thumbnail preview */}
        <div className="relative flex h-28 w-28 flex-none items-center justify-center overflow-hidden rounded-xl border border-dashed border-ink-200 bg-ink-50">
          {preview ? (
            // Using <img> instead of next/image so an arbitrary CDN hostname
            // (e.g. a custom Supabase project URL) works out of the box
            // without needing a next.config.mjs change per deployment.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid place-items-center text-ink-400">
              <Icon name="Image" size={22} />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-medium text-ink-700">
              Uploading…
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            onChange={onPick}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 text-sm font-medium text-ink-700 hover:border-ink-300 disabled:opacity-60"
          >
            <Icon name="Upload" size={14} />
            {value ? "Replace image" : "Upload image"}
          </button>
          {value && !uploading && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 text-sm font-medium text-ink-700 hover:border-ink-300"
            >
              <Icon name="Trash2" size={14} />
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Power-user fallback: paste a URL directly. Kept hidden behind a
          small label so the upload flow is the obvious primary action but
          CDN links still work for folks who don't want to upload. */}
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-500">
          Or paste an image URL
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          placeholder="https://…"
          disabled={uploading}
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
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
