import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Singleton Supabase client for the *server* runtime only.
//
// We deliberately expose two clients:
//   - `supabase`       : uses SUPABASE_ANON_KEY, respects Row-Level Security.
//                        Fine for public reads (products, categories, GET /settings).
//   - `supabaseAdmin`  : uses SUPABASE_SERVICE_ROLE_KEY, bypasses RLS. Used
//                        for every write path we route through our own auth
//                        checks (admin mutations, order creation, etc).
//
// If you haven't enabled RLS yet, anon is enough; but the service-role client
// is what makes this safe once RLS is on. Falls back to anon so the app still
// runs on the anon key alone in quick demos.
// ---------------------------------------------------------------------------

const g = globalThis as unknown as {
  __novaSupabase?: SupabaseClient;
  __novaSupabaseAdmin?: SupabaseClient;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing ${name}. Set it in your .env.local (dev) and Vercel environment variables (prod).`
    );
  }
  return v;
}

export function getSupabase(): SupabaseClient {
  if (g.__novaSupabase) return g.__novaSupabase;
  const url = requireEnv("SUPABASE_URL");
  const anon = requireEnv("SUPABASE_ANON_KEY");
  g.__novaSupabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return g.__novaSupabase;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (g.__novaSupabaseAdmin) return g.__novaSupabaseAdmin;
  const url = requireEnv("SUPABASE_URL");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? requireEnv("SUPABASE_ANON_KEY");
  g.__novaSupabaseAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return g.__novaSupabaseAdmin;
}
