import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
    // Access checks run in protected pages and API routes against Better Auth's
    // server-side session store, not against the presence of a browser cookie.
    return handleI18nRouting(request);
}

export const config = {
    matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)"
};
