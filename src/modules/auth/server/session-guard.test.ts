import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("./account-runtime", () => ({
  loadAccountRuntime: vi.fn(async () => ({})),
  findAccountSession: state.session,
}));
import { protectAccountRoute } from "./session-guard";

beforeEach(() => state.session.mockReset());
describe("protected CSV boundary", () => {
  it.each(["inspect", "review", "export"])(
    "does not invoke %s without a valid account session",
    async (path) => {
      state.session.mockResolvedValue(null);
      const handler = vi.fn();
      const response = await protectAccountRoute(
        new Request(`http://localhost/api/csv-import/${path}`),
        handler,
      );
      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    },
  );
  it("delegates file processing only after authentication", async () => {
    state.session.mockResolvedValue({ user: { id: "user" } });
    const response = Response.json({ ok: true });
    const handler = vi.fn(async () => response);
    const request = new Request("http://localhost/api/csv-import/inspect");
    expect(await protectAccountRoute(request, handler)).toBe(response);
    expect(handler).toHaveBeenCalledWith(request);
  });
});
