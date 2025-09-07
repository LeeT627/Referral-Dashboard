import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client using server-side environment variables.
 * Uses the anon key (read-only) so no privileged access is required.
 */
export function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY. Set them in your environment."
    );
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

