import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { readEnv } from "@/lib/env";

const getSupabaseUrl = () =>
  readEnv("NEXT_PUBLIC_SUPABASE_URL", "OB_PUBLIC_SUPABASE_URL", "SUPABASE_URL");

const getSupabasePublishableKey = () =>
  readEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "OB_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "OB_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
  );

export const updateSession = async (
  request: NextRequest,
  response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  }),
) => {
  const supabaseUrl = getSupabaseUrl();
  const supabasePublishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabasePublishableKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  await supabase.auth.getClaims();

  return response;
};
