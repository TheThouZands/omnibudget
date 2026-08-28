import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
    const response = handleI18nRouting(request);

    // This public tool processes only the submitted file and does not use a session.
    const pathname = request.nextUrl.pathname.replace(/\/$/, "");
    if (pathname === "/csv-import" || routing.locales.some((locale) => pathname === `/${locale}/csv-import`)) {
        return response;
    }

    return updateSession(request, response);
}

export const config = {
    matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)"
};
