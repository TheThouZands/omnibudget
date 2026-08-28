import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock("@/db");
  vi.resetModules();
});

describe("optional database health endpoint", () => {
  it("loads the database only when its health check is requested", async () => {
    const query = vi.fn().mockResolvedValue([{ ok: 1 }]);
    const loadDatabase = vi.fn(() => ({ dbClient: query }));
    vi.doMock("@/db", loadDatabase);
    const { GET } = await import("./route");
    expect(loadDatabase).not.toHaveBeenCalled();

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(loadDatabase).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledOnce();
  });

  it("does not prevent route loading when database configuration is absent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const loadDatabase = vi.fn(() => { throw new Error("missing test database configuration"); });
    vi.doMock("@/db", loadDatabase);
    const { GET } = await import("./route");
    expect(loadDatabase).not.toHaveBeenCalled();

    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "Database health check failed" });
  });
});
