import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AccountClientError,
  readAccessStatus,
  submitAccount,
} from "./account-client";

afterEach(() => vi.unstubAllGlobals());
describe("account client", () => {
  it.each(["login", "register"] as const)(
    "accepts the server-selected %s step",
    async (step) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json({ step, email: "test@example.com" })),
      );
      expect(await readAccessStatus()).toEqual({
        step,
        email: "test@example.com",
      });
    },
  );
  it("rejects a malformed status response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ step: "register" })),
    );
    await expect(readAccessStatus()).rejects.toThrow(AccountClientError);
  });
  it("sends credentials with the browser session and without caching", async () => {
    const fetch = vi.fn(async () => Response.json({ success: true }));
    vi.stubGlobal("fetch", fetch);
    await submitAccount("login", {
      email: "test@example.com",
      password: "test password",
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      }),
    );
  });
  it("does not treat an HTTP error or missing success flag as successful login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ code: "invalid_credentials" }, { status: 401 }),
      ),
    );
    await expect(submitAccount("login", {})).rejects.toMatchObject({
      code: "invalid_credentials",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ verified: true })),
    );
    await expect(submitAccount("login", {})).rejects.toThrow(
      AccountClientError,
    );
  });
});
