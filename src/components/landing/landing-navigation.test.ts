import { createElement, type AnchorHTMLAttributes, type ImgHTMLAttributes } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/modules/auth/server/current-session", () => ({ getCurrentAccountSession: state.session }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => Object.assign((key: string) => key, { rich: (key: string) => key }),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "es" }));
vi.mock("next/image", () => ({
  default: ({ alt, src, width, height }: ImgHTMLAttributes<HTMLImageElement>) =>
    createElement("img", { alt, src, width, height }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) =>
    createElement("a", { ...props, "data-prefetch": String(prefetch) }),
  getPathname: ({ href }: { href: string }) => `/es${href}`,
}));
vi.mock("./guilloche-backdrop", () => ({ GuillocheBackdrop: () => null }));

import Home from "@/app/[locale]/page";

beforeEach(() => vi.resetAllMocks());

describe("landing account navigation", () => {
  it.each([false, true])("renders consistent entry links and logout visibility (authenticated=%s)", async (authenticated) => {
    state.session.mockResolvedValue(authenticated ? { user: { id: "private-user-id" } } : null);
    const html = renderToStaticMarkup(await Home());
    const entryLinks = [...html.matchAll(/<a\b[^>]*href="(\/login|\/csv-import)"[^>]*>/g)];
    expect(entryLinks).toHaveLength(3);
    for (const [tag, href] of entryLinks) {
      expect(href).toBe(authenticated ? "/csv-import" : "/login");
      expect(tag).toContain('data-prefetch="false"');
    }
    expect(html.includes("account.logout")).toBe(authenticated);
    expect(html).not.toContain("private-user-id");
    expect(state.session).toHaveBeenCalledOnce();
  });
});
