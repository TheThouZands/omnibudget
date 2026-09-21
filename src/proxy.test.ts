import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const handlers = vi.hoisted(() => ({ locale: vi.fn(), session: vi.fn() }));
vi.mock("next-intl/middleware", () => ({ default: () => handlers.locale }));
vi.mock("@/lib/supabase/proxy", () => ({ updateSession: handlers.session }));

import proxy from "./proxy";

beforeEach(() => {
  handlers.locale.mockReset().mockReturnValue(NextResponse.next());
  handlers.session.mockReset().mockImplementation(async (_request, response) => response);
});

describe("locale routing without a separate Supabase Auth session", () => {
  it.each(["/csv-import", "/csv-import/", "/es/csv-import", "/es/csv-import/"])("does not contact auth for %s", async (path) => {
    const response = await proxy(new NextRequest(`http://localhost${path}`));
    expect(response).toBe(handlers.locale.mock.results[0].value);
    expect(handlers.session).not.toHaveBeenCalled();
  });

  it.each(["/es", "/es/private", "/es/csv-import/nested", "/csv-import-extra", "/en/csv-import"])("leaves account authorization to the page or API for %s", async (path) => {
    const request = new NextRequest(`http://localhost${path}`);
    await proxy(request);
    expect(handlers.locale).toHaveBeenCalledWith(request);
    expect(handlers.session).not.toHaveBeenCalled();
  });
});
