"use client";

import { createBrowserClient } from "@supabase/ssr";

const requirePublicEnv = (value: string | undefined, name: string) => {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(`${name} is not configured.`);
  }

  return trimmed;
};

export const createClient = () =>
  createBrowserClient(
    requirePublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    requirePublicEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
  );
