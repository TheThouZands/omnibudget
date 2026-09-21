import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ session: vi.fn(), redirect: vi.fn(), page: vi.fn(), modal: vi.fn() }));
vi.mock("@/modules/auth/server/current-session", () => ({ getCurrentAccountSession: state.session }));
vi.mock("@/i18n/navigation", () => ({ redirect: state.redirect }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "es" }));
vi.mock("./access-modal", () => ({ AccessModal: state.modal }));
vi.mock("./access-page", () => ({ AccessPage: state.page }));

import { AccessEntry } from "./access-entry";

beforeEach(() => {
  vi.resetAllMocks();
  state.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
});

describe("server-side access entry", () => {
  it.each([false, true])("redirects an authenticated visit before rendering UI (modal=%s)", async (modal) => {
    state.session.mockResolvedValue({ user: { id: "account" } });
    await expect(AccessEntry({ modal })).rejects.toThrow("NEXT_REDIRECT");
    expect(state.redirect).toHaveBeenCalledWith({ href: "/csv-import", locale: "es" });
  });

  it.each([false, true])("keeps the guest page/modal available (modal=%s)", async (modal) => {
    state.session.mockResolvedValue(null);
    expect((await AccessEntry({ modal })).type).toBe(modal ? state.modal : state.page);
    expect(state.redirect).not.toHaveBeenCalled();
  });

  it("waits for the server check instead of emitting a temporary email form", async () => {
    let resolveSession!: (session: null) => void;
    state.session.mockReturnValue(new Promise((resolve) => { resolveSession = resolve; }));
    let rendered = false;
    const entry = AccessEntry({ modal: true }).then((result) => { rendered = true; return result; });
    await Promise.resolve();
    expect(rendered).toBe(false);
    resolveSession(null);
    expect((await entry).type).toBe(state.modal);
  });
});
