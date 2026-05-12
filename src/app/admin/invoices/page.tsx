"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";
import {
  useInvoices,
  useOrders,
  useSettings,
} from "@/lib/client/hooks";
import { apiSend } from "@/lib/client/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/useI18n";
import type { Invoice, Order } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<Invoice["status"], string> = {
  paid: "bg-emerald-50 text-emerald-700",
  unpaid: "bg-amber-50 text-amber-700",
  overdue: "bg-red-50 text-red-700",
};

export default function InvoicesAdminPage() {
  const { t, locale } = useI18n();
  const { data: invoices, reload } = useInvoices();
  const { data: orders } = useOrders();
  const settings = useSettings();
  const currency = settings?.currency ?? "USD";
  const [viewing, setViewing] = useState<Invoice | null>(null);

  async function togglePaid(inv: Invoice) {
    await apiSend(`/api/invoices/${inv.id}`, "PATCH", {
      status: inv.status === "paid" ? "unpaid" : "paid",
    });
    await reload();
  }

  const linkedOrder = (inv: Invoice) =>
    orders.find((o) => o.id === inv.orderId);

  return (
    <AdminShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("admin.invoices")}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Digital invoices are auto-generated at checkout.
          </p>
        </header>

        {/* ----- MOBILE: stacked cards ----------------------------------
            The desktop table has 7 columns (invoice #, order ref, issued,
            due, amount, status, actions) — impossible to fit under ~640px
            without horizontal scroll. The mobile layout surfaces every key
            field as a labelled row so nothing gets clipped.
        */}
        <div className="space-y-3 md:hidden">
          {invoices.length === 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-6 text-center text-sm text-ink-400 shadow-soft">
              No invoices.
            </div>
          )}
          {invoices.map((inv) => (
            <article
              key={inv.id}
              className="space-y-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {inv.number}
                  </div>
                  <div className="truncate text-xs text-ink-500">
                    Order {inv.orderId}
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_TONE[inv.status]
                  )}
                >
                  {inv.status}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <MetaRow label="Issued" value={formatDate(inv.issuedAt, locale)} />
                <MetaRow label="Due" value={formatDate(inv.dueAt, locale)} />
                <MetaRow
                  label="Amount"
                  value={formatCurrency(inv.amount, locale, currency)}
                  strong
                />
              </dl>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewing(inv)}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-ink-200 bg-white text-sm font-medium text-ink-700 hover:border-ink-300"
                >
                  <Icon name="FileText" size={14} />
                  View
                </button>
                <button
                  onClick={() => togglePaid(inv)}
                  className={cn(
                    "inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg text-sm font-medium transition",
                    inv.status === "paid"
                      ? "bg-ink-100 text-ink-700 hover:bg-ink-200"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  )}
                >
                  <Icon name="CheckCircle2" size={14} />
                  {inv.status === "paid" ? "Mark unpaid" : "Mark paid"}
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* ----- DESKTOP: table --------------------------------------- */}
        <div className="hidden overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-ink-50 text-ink-600">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">Invoice</th>
                  <th className="px-4 py-3 text-start font-medium">Order</th>
                  <th className="px-4 py-3 text-start font-medium">Issued</th>
                  <th className="px-4 py-3 text-start font-medium">Due</th>
                  <th className="px-4 py-3 text-end font-medium">Amount</th>
                  <th className="px-4 py-3 text-start font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-ink-50/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {inv.number}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                      {inv.orderId}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                      {formatDate(inv.issuedAt, locale)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                      {formatDate(inv.dueAt, locale)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-end font-semibold">
                      {formatCurrency(inv.amount, locale, currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_TONE[inv.status]
                        )}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setViewing(inv)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-ink-100"
                          aria-label="View"
                        >
                          <Icon name="FileText" size={16} />
                        </button>
                        <button
                          onClick={() => togglePaid(inv)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-emerald-50 hover:text-emerald-600"
                          aria-label="Toggle paid"
                        >
                          <Icon name="CheckCircle2" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-ink-400">
                      No invoices.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewing && (
        <InvoiceModal
          invoice={viewing}
          order={linkedOrder(viewing)}
          currency={currency}
          onClose={() => setViewing(null)}
        />
      )}
    </AdminShell>
  );
}

function MetaRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-lg bg-ink-50 px-2 py-1.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </dt>
      <dd
        className={cn(
          "truncate",
          strong ? "text-sm font-semibold text-ink-900" : "text-xs text-ink-700"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function InvoiceModal({
  invoice,
  order,
  currency,
  onClose,
}: {
  invoice: Invoice;
  order?: Order;
  currency: string;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-lift">
        <header className="flex items-center justify-between border-b border-ink-100 p-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">
              {invoice.number}
            </h3>
            <p className="text-xs text-ink-500">
              Issued {formatDate(invoice.issuedAt, locale)} · Due{" "}
              {formatDate(invoice.dueAt, locale)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 flex-none place-items-center rounded-full text-ink-600 hover:bg-ink-100"
            aria-label="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </header>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-4 sm:p-6">
          <section className="flex flex-col items-start justify-between gap-4 sm:flex-row">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-500">
                Billed to
              </div>
              <div className="mt-1 font-medium">
                {order?.customer.name ?? "—"}
              </div>
              <div className="text-sm text-ink-600">
                {order?.customer.email}
              </div>
              <div className="text-sm text-ink-600">
                {order?.customer.address}
              </div>
            </div>
            <div className="sm:text-end">
              <div className="text-xs uppercase tracking-wide text-ink-500">
                From
              </div>
              <div className="mt-1 font-medium">Nova Commerce</div>
              <div className="text-sm text-ink-600">hello@nova.shop</div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-ink-100">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-ink-50 text-ink-600">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">Item</th>
                    <th className="px-3 py-2 text-end font-medium">Qty</th>
                    <th className="px-3 py-2 text-end font-medium">Price</th>
                    <th className="px-3 py-2 text-end font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {(order?.items ?? []).map((it) => (
                    <tr key={it.productId}>
                      <td className="px-3 py-2">{it.name}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-end">
                        {it.quantity}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-end">
                        {formatCurrency(it.price, locale, currency)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-end font-medium">
                        {formatCurrency(
                          it.price * it.quantity,
                          locale,
                          currency
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-1 text-sm">
            <div className="flex justify-between text-ink-600">
              <span>Subtotal</span>
              <span>{formatCurrency(order?.subtotal ?? 0, locale, currency)}</span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>Tax</span>
              <span>{formatCurrency(order?.tax ?? 0, locale, currency)}</span>
            </div>
            <div className="flex justify-between pt-1 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(invoice.amount, locale, currency)}</span>
            </div>
          </section>
        </div>
        <footer className="flex flex-col-reverse justify-end gap-2 border-t border-ink-100 p-4 sm:flex-row">
          <button
            onClick={() => window.print()}
            className="h-10 rounded-xl border border-ink-200 bg-white px-4 text-sm font-medium text-ink-700 hover:border-ink-300"
          >
            Print / PDF
          </button>
          <button
            onClick={onClose}
            className="h-10 rounded-xl bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
