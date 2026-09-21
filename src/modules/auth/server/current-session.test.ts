import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ headers: vi.fn(), load: vi.fn(), find: vi.fn() }));
vi.mock("next/headers", () => ({ headers: state.headers }));
vi.mock("./account-runtime", () => ({ loadAccountRuntime: state.load, findAccountSession: state.find }));

import { getCurrentAccountSession } from "./current-session";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BETTER_AUTH_URL", "");
  vi.stubEnv("NODE_ENV", "test");
  state.load.mockResolvedValue({ auth: "test-runtime" });
});
afterEach(() => vi.unstubAllEnvs());

describe("current page session", () => {
  it.each(["", "theme=light", "omnibudget_verification=proof-only"])(
    "does not initialize account storage without an account cookie: %s",
    async (cookie) => {
      state.headers.mockResolvedValue(new Headers({ cookie }));
      expect(await getCurrentAccountSession()).toBeNull();
      expect(state.load).not.toHaveBeenCalled();
      expect(state.find).not.toHaveBeenCalled();
    },
  );

  it.each(["omnibudget.session_token", "__Secure-omnibudget.session_token"])(
    "verifies %s against the existing server-side session boundary",
    async (name) => {
      const requestHeaders = new Headers({ host: "localhost:3000", cookie: `${name}=signed-token` });
      state.headers.mockResolvedValue(requestHeaders);
      const session = { user: { id: "account" } };
      state.find.mockResolvedValue(session);

      expect(await getCurrentAccountSession()).toBe(session);
      expect(state.load).toHaveBeenCalledWith("http://localhost:3000");
      expect(state.find).toHaveBeenCalledWith(requestHeaders, { auth: "test-runtime" });
    },
  );

  it("does not treat a forged, expired or revoked cookie as authentication", async () => {
    state.headers.mockResolvedValue(new Headers({ cookie: "omnibudget.session_token=invalid" }));
    state.find.mockResolvedValue(null);
    expect(await getCurrentAccountSession()).toBeNull();
    expect(state.find).toHaveBeenCalledOnce();
  });

  it("uses the configured canonical origin", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://app.example.com");
    state.headers.mockResolvedValue(new Headers({ host: "proxy.internal", cookie: "omnibudget.session_token=token" }));
    await getCurrentAccountSession();
    expect(state.load).toHaveBeenCalledWith("https://app.example.com");
  });

  it("does not grant access when session verification fails", async () => {
    state.headers.mockResolvedValue(new Headers({ cookie: "omnibudget.session_token=token" }));
    state.find.mockRejectedValue(new Error("Session storage unavailable"));
    await expect(getCurrentAccountSession()).rejects.toThrow("Session storage unavailable");
  });
});
