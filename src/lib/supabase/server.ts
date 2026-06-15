import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireEnv } from "@/lib/env";

const getSupabaseUrl = () =>
  requireEnv(
    ["NEXT_PUBLIC_SUPABASE_URL", "OB_PUBLIC_SUPABASE_URL", "SUPABASE_URL"],
    "Supabase URL",
  );

const getSupabasePublishableKey = () =>
  requireEnv(
    [
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "OB_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "OB_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_ANON_KEY",
    ],
    "Supabase publishable key",
  );

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies; the proxy refreshes sessions.
        }
      },
    },
  });
};
