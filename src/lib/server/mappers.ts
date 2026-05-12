import type {
  Category,
  Invoice,
  Order,
  OrderStatus,
  Product,
  Settings,
  User,
} from "../types";

// ---------------------------------------------------------------------------
// Supabase ↔ domain-type mappers.
//
// Supabase columns are snake_case and the localized strings are stored as
// three separate columns (name_en / name_ar / name_fr) to keep the SQL schema
// friendly. These helpers convert between that shape and the camelCase,
// LocalizedString shape the rest of the app uses.
// ---------------------------------------------------------------------------

// ---- Product ----
export interface ProductRow {
  id: string;
  sku: string;
  name_en: string;
  name_ar: string;
  name_fr: string;
  description_en: string;
  description_ar: string;
  description_fr: string;
  price: number;
  category_id: string;
  stock: number;
  image: string;
  rating: number;
  created_at: string;
}

export function productFromRow(r: ProductRow): Product {
  return {
    id: r.id,
    sku: r.sku,
    name: { en: r.name_en, ar: r.name_ar, fr: r.name_fr },
    description: {
      en: r.description_en ?? "",
      ar: r.description_ar ?? "",
      fr: r.description_fr ?? "",
    },
    price: Number(r.price),
    categoryId: r.category_id,
    stock: Number(r.stock),
    image: r.image,
    rating: Number(r.rating ?? 0),
    createdAt: r.created_at,
  };
}

export function productToRow(p: Partial<Product>): Partial<ProductRow> {
  const row: Partial<ProductRow> = {};
  if (p.id !== undefined) row.id = p.id;
  if (p.sku !== undefined) row.sku = p.sku;
  if (p.name) {
    row.name_en = p.name.en;
    row.name_ar = p.name.ar;
    row.name_fr = p.name.fr;
  }
  if (p.description) {
    row.description_en = p.description.en;
    row.description_ar = p.description.ar;
    row.description_fr = p.description.fr;
  }
  if (p.price !== undefined) row.price = p.price;
  if (p.categoryId !== undefined) row.category_id = p.categoryId;
  if (p.stock !== undefined) row.stock = p.stock;
  if (p.image !== undefined) row.image = p.image;
  if (p.rating !== undefined) row.rating = p.rating;
  if (p.createdAt !== undefined) row.created_at = p.createdAt;
  return row;
}

// ---- Category ----
export interface CategoryRow {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  name_fr: string;
  icon: string;
}

export function categoryFromRow(r: CategoryRow): Category {
  return {
    id: r.id,
    slug: r.slug,
    name: { en: r.name_en, ar: r.name_ar, fr: r.name_fr },
    icon: r.icon,
  };
}

// ---- User ----
export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin";
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  banned: boolean;
  password_hash: string;
  created_at: string;
  last_seen_at: string | null;
}

export function userFromRow(r: UserRow): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
    city: r.city ?? undefined,
    postalCode: r.postal_code ?? undefined,
    country: r.country ?? undefined,
    banned: !!r.banned,
    passwordHash: r.password_hash,
    createdAt: r.created_at,
    lastSeenAt: r.last_seen_at ?? undefined,
  };
}

export function userToRow(u: Partial<User>): Partial<UserRow> {
  const row: Partial<UserRow> = {};
  if (u.id !== undefined) row.id = u.id;
  if (u.email !== undefined) row.email = u.email;
  if (u.name !== undefined) row.name = u.name;
  if (u.role !== undefined) row.role = u.role;
  if (u.phone !== undefined) row.phone = u.phone ?? null;
  if (u.address !== undefined) row.address = u.address ?? null;
  if (u.city !== undefined) row.city = u.city ?? null;
  if (u.postalCode !== undefined) row.postal_code = u.postalCode ?? null;
  if (u.country !== undefined) row.country = u.country ?? null;
  if (u.banned !== undefined) row.banned = u.banned;
  if (u.passwordHash !== undefined) row.password_hash = u.passwordHash;
  if (u.createdAt !== undefined) row.created_at = u.createdAt;
  if (u.lastSeenAt !== undefined) row.last_seen_at = u.lastSeenAt ?? null;
  return row;
}

// ---- Order + order_items ----
export interface OrderRow {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string;
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  created_at: string;
}

export interface OrderItemRow {
  id?: number;
  order_id: string;
  product_id: string;
  name: string;
  quantity: number;
  price: number;
}

export function orderFromRow(r: OrderRow, items: OrderItemRow[]): Order {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    customer: {
      name: r.customer_name,
      email: r.customer_email,
      phone: r.customer_phone ?? "",
      address: r.customer_address,
    },
    items: items
      .filter((i) => i.order_id === r.id)
      .map((i) => ({
        productId: i.product_id,
        name: i.name,
        quantity: Number(i.quantity),
        price: Number(i.price),
      })),
    subtotal: Number(r.subtotal),
    tax: Number(r.tax),
    total: Number(r.total),
    status: r.status,
    createdAt: r.created_at,
  };
}

// ---- Invoice ----
export interface InvoiceRow {
  id: string;
  order_id: string;
  number: string;
  issued_at: string;
  due_at: string;
  status: Invoice["status"];
  amount: number;
}

export function invoiceFromRow(r: InvoiceRow): Invoice {
  return {
    id: r.id,
    orderId: r.order_id,
    number: r.number,
    issuedAt: r.issued_at,
    dueAt: r.due_at,
    status: r.status,
    amount: Number(r.amount),
  };
}

// ---- Settings ----
export interface SettingsRow {
  id: number;
  store_name: string;
  currency: string;
  tax_rate: number;
  low_stock_threshold: number;
}

export function settingsFromRow(r: SettingsRow): Settings {
  return {
    storeName: r.store_name,
    currency: r.currency,
    taxRate: Number(r.tax_rate),
    lowStockThreshold: Number(r.low_stock_threshold),
  };
}

export function settingsToRow(s: Partial<Settings>): Partial<SettingsRow> {
  const row: Partial<SettingsRow> = {};
  if (s.storeName !== undefined) row.store_name = s.storeName;
  if (s.currency !== undefined) row.currency = s.currency;
  if (s.taxRate !== undefined) row.tax_rate = s.taxRate;
  if (s.lowStockThreshold !== undefined) row.low_stock_threshold = s.lowStockThreshold;
  return row;
}
