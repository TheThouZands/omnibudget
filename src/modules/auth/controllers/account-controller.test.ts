import { randomUUID } from "node:crypto";
import { memoryAdapter } from "better-auth/adapters/memory";
import { describe, expect, it } from "vitest";
import { accountController } from "./account-controller";
import { createAccountAuth } from "../server/account-auth";
import { MemoryAccountRepository } from "../repositories/memory-account-repository";
import { MemoryVerificationSessionRepository } from "../repositories/memory-verification-session-repository";
import { createVerificationSessionService } from "../services/verification-session-service";

const origin = "http://localhost:3000";
const email = "person@example.com";
const input = { email, password: "A long test password 1!", username: "Personal", country: "", phone: "", workspaceName: "Home" };

async function setup() {
  const database = {};
  const accounts = new MemoryAccountRepository(database);
  const verification = createVerificationSessionService({ repository: new MemoryVerificationSessionRepository(), hashSecret: "test-secret-with-more-than-32-characters" });
  const auth = createAccountAuth({ accounts, verification, database: memoryAdapter(database), production: false, baseURL: origin, secret: "another-test-secret-with-more-than-32-characters" });
  const controller = accountController(async () => ({ accounts, auth, verification }));
  const { token } = await verification.issue({ otpChallengeId: randomUUID(), email });
  const cookie = `ob_email_verification=${token}`;
  function request(method = "GET", body?: unknown, customHeaders: Record<string, string> = {}) {
    return new Request(`${origin}/api/auth/access`, { method, headers: { origin, cookie, "content-type": "application/json", ...customHeaders }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  return { controller, request, verification, cookie };
}

describe("account HTTP boundary", () => {
  it.each(["short1!", "lowercase1!", "UPPERCASE1!", "NoNumber!", "NoSymbol1"])("rejects a password outside the policy: %s", async (password) => {
    const { controller, request } = await setup();
    expect((await controller.register(request("POST", { ...input, password }))).status).toBe(400);
    expect(await (await controller.status(request())).json()).toEqual({ step: "register", email });
  });
  it("reveals the account step only to the verified browser", async () => {
    const { controller, request } = await setup();
    expect(await (await controller.status(request())).json()).toEqual({ step: "register", email });
    expect(await (await controller.status(request("GET", undefined, { cookie: "" }))).json()).toEqual({ step: "email" });
  });

  it("revokes proof when changing email and blocks subsequent registration", async () => {
    const { controller, request } = await setup();
    expect((await controller.reset(request("DELETE"))).status).toBe(200);
    expect((await controller.register(request("POST", input))).status).toBe(401);
  });

  it("rejects cross-site and missing-origin mutations", async () => {
    const { controller, request } = await setup();
    for (const origin of ["https://attacker.invalid", ""]) {
      expect((await controller.register(request("POST", input, { origin }))).status).toBe(403);
    }
  });

  it("validates input, bounds bodies, and marks responses private", async () => {
    const { controller, request } = await setup();
    expect((await controller.register(request("POST", { ...input, phoneVerified: true }))).status).toBe(400);
    expect((await controller.register(request("POST", { ...input, phone: "1".repeat(41) }))).status).toBe(400);
    const response = await controller.register(request("POST", { ...input, username: "a".repeat(4100) }));
    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await controller.register(request("POST", input, { "content-type": "text/plain" }))).status).toBe(415);
  });
});
