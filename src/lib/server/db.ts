import "server-only";
import { getSupabase, getSupabaseAdmin } from "./supabase";
import {
  CategoryRow,
  InvoiceRow,
  OrderItemRow,
  OrderRow,
  ProductRow,
  SettingsRow,
  UserRow,
  categoryFromRow,
  invoiceFromRow,
  orderFromRow,
  productFromRow,
  productToRow,
  settingsFromRow,
  settingsToRow,
  userFromRow,
  userToRow,
} from "./mappers";
import type {
  Category,
  Invoice,
  Order,
  Product,
  Settings,
  User,
} from "../types";

// ---------------------------------------------------------------------------
// Supabase-backed DB. No file system writes — works on Vercel's read-only FS.
//
// The export surface intentionally matches the previous JSON-backed module
// (listProducts, getProduct, createProduct, …, nextProductId, etc.), so the
// route handlers in src/app/api/**/route.ts are unchanged.
// ---------------------------------------------------------------------------

// Public reads can use the anon client (RLS-friendly); mutations and admin
// reads use the service-role client so our own auth/authorization logic stays
// the single source of truth.
const read = () => getSupabase();
const write = () => getSupabaseAdmin();

function raise(msg: string, err: unknown): never {
  // Log with enough context to debug in Vercel logs without leaking secrets.
  // eslint-disable-next-line no-console
  console.error(`[db] ${msg}:`, err);
  throw new Error(msg);
}

// ---------- Products ----------

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await read()
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) raise("listProducts failed", error);
  return (data as ProductRow[]).map(productFromRow);
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await read()
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) raise("getProduct failed", error);
  return data ? productFromRow(data as ProductRow) : null;
}

export async function createProduct(p: Product): Promise<void> {
  const { error } = await write().from("products").insert(productToRow(p));
  if (error) raise("createProduct failed", error);
}

export async function updateProduct(
  id: string,
  patch: Partial<Product>
): Promise<Product | null> {
  const row = productToRow(patch);
  const { data, error } = await write()
    .from("products")
    .update(row)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) raise("updateProduct failed", error);
  return data ? productFromRow(data as ProductRow) : null;
}

export async function deleteProduct(id: string): Promise<Product | null> {
  const { data, error } = await write()
    .from("products")
    .delete()
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) raise("deleteProduct failed", error);
  return data ? productFromRow(data as ProductRow) : null;
}

/**
 * Generates a new product id. We no longer rely on a counters table — we
 * just count existing rows and pad. Good enough for demo data; for real
 * production either let Postgres `default uuid_generate_v4()` handle it or
 * use a dedicated sequence.
 */
export async function nextProductId(): Promise<string> {
  const { count, error } = await write()
    .from("products")
    .select("*", { count: "exact", head: true });
  if (error) raise("nextProductId failed", error);
  const n = (count ?? 0) + 1;
  return `p-${String(n).padStart(3, "0")}`;
}

// ---------- Categories ----------

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await read()
    .from("categories")
    .select("*")
    .order("slug");
  if (error) raise("listCategories failed", error);
  return (data as CategoryRow[]).map(categoryFromRow);
}

// ---------- Orders ----------

async function loadAllOrderItems(orderIds: string[]): Promise<OrderItemRow[]> {
  if (orderIds.length === 0) return [];
  const { data, error } = await write()
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);
  if (error) raise("loadAllOrderItems failed", error);
  return (data ?? []) as OrderItemRow[];
}

export async function listOrders(): Promise<Order[]> {
  const { data, error } = await write()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) raise("listOrders failed", error);
  const rows = (data ?? []) as OrderRow[];
  const items = await loadAllOrderItems(rows.map((r) => r.id));
  return rows.map((r) => orderFromRow(r, items));
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await write()
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) raise("getOrder failed", error);
  if (!data) return null;
  const items = await loadAllOrderItems([id]);
  return orderFromRow(data as OrderRow, items);
}

/**
 * Creates the order row AND its order_items in a two-step transaction-ish
 * sequence. If the items insert fails we roll the order row back. Supabase
 * doesn't expose true transactions over PostgREST — for a stronger guarantee
 * wrap this in a Postgres function and call it via `rpc("place_order", …)`.
 */
export async function createOrder(o: Order): Promise<void> {
  const sb = write();
  const orderRow: Omit<OrderRow, "id"> & { id: string } = {
    id: o.id,
    user_id: o.userId ?? null,
    customer_name: o.customer.name,
    customer_email: o.customer.email,
    customer_phone: o.customer.phone ?? null,
    customer_address: o.customer.address,
    subtotal: o.subtotal,
    tax: o.tax,
    total: o.total,
    status: o.status,
    created_at: o.createdAt,
  };

  const { error: orderErr } = await sb.from("orders").insert(orderRow);
  if (orderErr) raise("createOrder failed (orders insert)", orderErr);

  if (o.items.length > 0) {
    const itemRows = o.items.map<OrderItemRow>((i) => ({
      order_id: o.id,
      product_id: i.productId,
      name: i.name,
      quantity: i.quantity,
      price: i.price,
    }));
    const { error: itemsErr } = await sb.from("order_items").insert(itemRows);
    if (itemsErr) {
      // Best-effort rollback so we don't leave a dangling empty order.
      await sb.from("orders").delete().eq("id", o.id);
      raise("createOrder failed (order_items insert)", itemsErr);
    }
  }
}

export async function updateOrder(
  id: string,
  patch: Partial<Order>
): Promise<Order | null> {
  const row: Partial<OrderRow> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.customer) {
    row.customer_name = patch.customer.name;
    row.customer_email = patch.customer.email;
    row.customer_phone = patch.customer.phone ?? null;
    row.customer_address = patch.customer.address;
  }
  if (Object.keys(row).length === 0) return getOrder(id);

  const { data, error } = await write()
    .from("orders")
    .update(row)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) raise("updateOrder failed", error);
  if (!data) return null;
  const items = await loadAllOrderItems([id]);
  return orderFromRow(data as OrderRow, items);
}

export async function nextOrderId(): Promise<string> {
  const { count, error } = await write()
    .from("orders")
    .select("*", { count: "exact", head: true });
  if (error) raise("nextOrderId failed", error);
  const n = 1000 + (count ?? 0) + 1;
  return `o-${n}`;
}

// ---------- Invoices ----------

export async function listInvoices(): Promise<Invoice[]> {
  const { data, error } = await write()
    .from("invoices")
    .select("*")
    .order("issued_at", { ascending: false });
  if (error) raise("listInvoices failed", error);
  return ((data ?? []) as InvoiceRow[]).map(invoiceFromRow);
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await write()
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) raise("getInvoice failed", error);
  return data ? invoiceFromRow(data as InvoiceRow) : null;
}

export async function createInvoice(inv: Invoice): Promise<void> {
  const { error } = await write().from("invoices").insert({
    id: inv.id,
    order_id: inv.orderId,
    number: inv.number,
    issued_at: inv.issuedAt,
    due_at: inv.dueAt,
    status: inv.status,
    amount: inv.amount,
  });
  if (error) raise("createInvoice failed", error);
}

export async function updateInvoice(
  id: string,
  patch: Partial<Invoice>
): Promise<Invoice | null> {
  const row: Partial<InvoiceRow> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.dueAt !== undefined) row.due_at = patch.dueAt;
  if (patch.number !== undefined) row.number = patch.number;

  const { data, error } = await write()
    .from("invoices")
    .update(row)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) raise("updateInvoice failed", error);
  return data ? invoiceFromRow(data as InvoiceRow) : null;
}

export async function nextInvoiceId(): Promise<string> {
  const { count, error } = await write()
    .from("invoices")
    .select("*", { count: "exact", head: true });
  if (error) raise("nextInvoiceId failed", error);
  const n = 5000 + (count ?? 0) + 1;
  return `i-${n}`;
}

// ---------- Users ----------

export async function listUsers(): Promise<User[]> {
  const { data, error } = await write()
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) raise("listUsers failed", error);
  return ((data ?? []) as UserRow[]).map(userFromRow);
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await write()
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) raise("getUserById failed", error);
  return data ? userFromRow(data as UserRow) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const e = email.toLowerCase().trim();
  const { data, error } = await write()
    .from("users")
    .select("*")
    .ilike("email", e)
    .maybeSingle();
  if (error) raise("getUserByEmail failed", error);
  return data ? userFromRow(data as UserRow) : null;
}

export async function createUser(u: User): Promise<void> {
  const { error } = await write().from("users").insert(userToRow(u));
  if (error) raise("createUser failed", error);
}

export async function updateUser(
  id: string,
  patch: Partial<User>
): Promise<User | null> {
  const row = userToRow(patch);
  const { data, error } = await write()
    .from("users")
    .update(row)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) raise("updateUser failed", error);
  return data ? userFromRow(data as UserRow) : null;
}

export async function deleteUser(id: string): Promise<User | null> {
  const { data, error } = await write()
    .from("users")
    .delete()
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) raise("deleteUser failed", error);
  return data ? userFromRow(data as UserRow) : null;
}

// ---------- Settings ----------
//
// The settings table is a single-row store keyed on `id = 1`.

const SETTINGS_ID = 1;

export async function getSettings(): Promise<Settings> {
  const { data, error } = await read()
    .from("settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .maybeSingle();
  if (error) raise("getSettings failed", error);
  if (!data) {
    // Settings row should exist (seeded). If missing (fresh DB), return sane
    // defaults so the storefront can still render.
    return {
      storeName: "Nova",
      currency: "USD",
      taxRate: 10,
      lowStockThreshold: 20,
    };
  }
  return settingsFromRow(data as SettingsRow);
}

export async function updateSettings(
  patch: Partial<Settings>
): Promise<Settings> {
  const row = settingsToRow(patch);
  const { data, error } = await write()
    .from("settings")
    .update(row)
    .eq("id", SETTINGS_ID)
    .select()
    .maybeSingle();
  if (error) raise("updateSettings failed", error);
  if (!data) {
    // Upsert if the single row is missing.
    const defaults = {
      id: SETTINGS_ID,
      store_name: "Nova",
      currency: "USD",
      tax_rate: 10,
      low_stock_threshold: 20,
      ...row,
    };
    const upsert = await write().from("settings").upsert(defaults).select().single();
    if (upsert.error) raise("updateSettings upsert failed", upsert.error);
    return settingsFromRow(upsert.data as SettingsRow);
  }
  return settingsFromRow(data as SettingsRow);
}
