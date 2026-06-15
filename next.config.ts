import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }
};

const publicSupabaseUrl = readEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
  "OB_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
);

const publicSupabasePublishableKey = readEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "OB_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "OB_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
);

const nextConfig: NextConfig = {
  env: {
    ...(publicSupabaseUrl
      ? { NEXT_PUBLIC_SUPABASE_URL: publicSupabaseUrl }
      : {}),
    ...(publicSupabasePublishableKey
      ? { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicSupabasePublishableKey }
      : {}),
  },
};

export default withNextIntl(nextConfig);
