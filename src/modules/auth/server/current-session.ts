import { cache } from "react";
import { headers } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";

import { findAccountSession, loadAccountRuntime } from "./account-runtime";

// Deduplicate within this server render only. Never share sessions across requests.
export const getCurrentAccountSession = cache(async () => {
  const requestHeaders = await headers();
  // Absence is a safe guest fast path. Presence still requires full verification.
  if (!getSessionCookie(requestHeaders, { cookiePrefix: "omnibudget" })) return null;

  const origin = process.env.BETTER_AUTH_URL
    || `${process.env.NODE_ENV === "production" ? "https" : "http"}://${requestHeaders.get("host") || "localhost:3000"}`;
  const runtime = await loadAccountRuntime(origin);
  return findAccountSession(requestHeaders, runtime);
});
