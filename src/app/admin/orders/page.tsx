"use client";

import { Fragment, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";
import { apiSend } from "@/lib/client/api";
import { useOrders, useSettings } from "@/lib/client/hooks";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/useI18n";
import type { Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  shipped: "bg-brand-50 text-brand-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function OrdersAdminPage() {
  const { t, locale } = useI18n();
  const { data: orders, reload } = useOrders();
  const settings = useSettings();
  const currency = settings?.currency ?? "USD";
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function setStatus(id: string, status: OrderStatus) {
    await apiSend(`/api/orders/${id}`, "PATCH", { status });
    await reload();
  }

  const filtered = orders.filter(
    (o) => filter === "all" || o.status === filter
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("admin.orders")}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Track and update every order in real time.
          </p>
        </header>

        {/* Filter chips — scroll horizontally on very small screens instead
            of wrapping into many rows and pushing the table off-screen. */}
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-2 sm:flex-wrap">
            <Chip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label={`All (${orders.length})`}
            />
            {STATUSES.map((s) => {
              const c = orders.filter((o) => o.status === s).length;
              return (
                <Chip
                  key={s}
                  active={filter === s}
                  onClick={() => setFilter(s)}
                  label={`${label(s)} (${c})`}
                />
              );
            })}
          </div>
        </div>

        {/* ----- MOBILE: stacked cards ------------------------------------
            On small screens a 6-column table with a date, total and a <select>
            for status can't fit without overlap. Switch to vertically stacked
            cards: every field gets its own row, status + total sit on the
            same flex row but wrap with gap when needed.
        */}
        <div className="space-y-3 md:hidden">
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-6 text-center text-sm text-ink-400 shadow-soft">
              No orders.
            </div>
          )}
          {filtered.map((o) => (
            <MobileOrderCard
              key={o.id}
              order={o}
              currency={currency}
              locale={locale}
              expanded={expanded === o.id}
              onToggle={() => setExpanded(expanded === o.id ? null : o.id)}
              onStatus={(s) => setStatus(o.id, s)}
            />
          ))}
        </div>

        {/* ----- DESKTOP: table ----------------------------------------- */}
        <div className="hidden overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-ink-50 text-ink-600">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">Order</th>
                  <th className="px-4 py-3 text-start font-medium">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-start font-medium">Date</th>
                  <th className="px-4 py-3 text-end font-medium">Total</th>
                  <th className="px-4 py-3 text-start font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((o) => (
                  <Fragment key={o.id}>
                    <tr className="hover:bg-ink-50/50">
                      <td className="px-4 py-3 font-medium">{o.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{o.customer.name}</div>
                        <div className="text-xs text-ink-500">
                          {o.customer.email}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                        {formatDate(o.createdAt, locale)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-end font-semibold">
                        {formatCurrency(o.total, locale, currency)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status}
                          onChange={(e) =>
                            setStatus(o.id, e.target.value as OrderStatus)
                          }
                          className={cn(
                            "h-8 rounded-lg border-0 px-2 text-xs font-medium",
                            STATUS_TONE[o.status]
                          )}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {label(s)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <button
                          onClick={() =>
                            setExpanded(expanded === o.id ? null : o.id)
                          }
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-ink-100"
                          aria-label="Expand"
                        >
                          <Icon
                            name={
                              expanded === o.id
                                ? "ChevronLeft"
                                : "ChevronRight"
                            }
                            size={16}
                          />
                        </button>
                      </td>
                    </tr>
                    {expanded === o.id && (
                      <tr className="bg-ink-50/50">
                        <td colSpan={6} className="px-4 py-4">
                          <OrderDetail
                            order={o}
                            currency={currency}
                            locale={locale}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-ink-400"
                    >
                      No orders.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

// ---------------------------------------------------------------------------
// Mobile card: each order is a self-contained block. Status badge + total
// live on a `flex-wrap` row, so they can't overlap on even the narrowest
// viewport — they just wrap to the next line.
// ---------------------------------------------------------------------------

function MobileOrderCard({
  order: o,
  currency,
  locale,
  expanded,
  onToggle,
  onStatus,
}: {
  order: Order;
  currency: string;
  locale: Parameters<typeof formatCurrency>[1];
  expanded: boolean;
  onToggle: () => void;
  onStatus: (s: OrderStatus) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{o.id}</div>
            <div className="truncate text-xs text-ink-500">
              {formatDate(o.createdAt, locale)}
            </div>
          </div>
          <div className="whitespace-nowrap text-end text-base font-semibold">
            {formatCurrency(o.total, locale, currency)}
          </div>
        </div>
        <div className="min-w-0 text-sm">
          <div className="truncate font-medium">{o.customer.name}</div>
          <div className="truncate text-xs text-ink-500">
            {o.customer.email}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={o.status}
            onChange={(e) => onStatus(e.target.value as OrderStatus)}
            className={cn(
              "h-8 max-w-full rounded-lg border-0 px-2 text-xs font-medium",
              STATUS_TONE[o.status]
            )}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
          <button
            onClick={onToggle}
            className="ms-auto inline-flex h-8 items-center gap-1 rounded-lg border border-ink-200 bg-white px-2 text-xs font-medium text-ink-700 hover:border-ink-300"
          >
            {expanded ? "Hide details" : "Details"}
            <Icon
              name={expanded ? "ChevronLeft" : "ChevronRight"}
              size={14}
            />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-ink-100 bg-ink-50/50 p-4">
          <OrderDetail order={o} currency={currency} locale={locale} />
        </div>
      )}
    </article>
  );
}

function OrderDetail({
  order: o,
  currency,
  locale,
}: {
  order: Order;
  currency: string;
  locale: Parameters<typeof formatCurrency>[1];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
          Shipping
        </h4>
        <p className="text-sm">{o.customer.address}</p>
        <p className="text-sm text-ink-600">{o.customer.phone}</p>
      </div>
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
          Items
        </h4>
        <ul className="text-sm">
          {o.items.map((it) => (
            <li
              key={it.productId}
              className="flex items-start justify-between gap-3"
            >
              <span className="min-w-0 flex-1 truncate">
                {it.name} × {it.quantity}
              </span>
              <span className="whitespace-nowrap font-medium">
                {formatCurrency(it.price * it.quantity, locale, currency)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function label(s: OrderStatus) {
  return s[0].toUpperCase() + s.slice(1);
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-ink-900 bg-ink-900 text-white"
          : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
      )}
    >
      {label}
    </button>
  );
}
