import { randomUUID } from "node:crypto";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";
import { describe, expect, it } from "vitest";
import { createAccountAuth } from "./account-auth";
import { MemoryAccountRepository } from "../repositories/memory-account-repository";
import { MemoryVerificationSessionRepository } from "../repositories/memory-verification-session-repository";
import { createVerificationSessionService } from "../services/verification-session-service";

const email = "person@example.com";
const registration = { email, password: "My long test password 1!", username: "My family", workspaceName: "Home", country: "", phone: "" };

function setup() {
  const database: MemoryDB = {};
  const accounts = new MemoryAccountRepository(database);
  const verification = createVerificationSessionService({ repository: new MemoryVerificationSessionRepository(), hashSecret: "test-only-verification-secret-32-characters" });
  const auth = createAccountAuth({ database: memoryAdapter(database), accounts, verification, secret: "test-only-auth-secret-more-than-32-characters", baseURL: "http://localhost:3000", production: false });
  async function headers(target = email) {
    const { token } = await verification.issue({ otpChallengeId: randomUUID(), email: target });
    return new Headers({ origin: "http://localhost:3000", cookie: `ob_email_verification=${token}` });
  }
  return { database, auth, accounts, verification, headers };
}

describe("OTP-gated Better Auth", () => {
  it("registers unresolved phone data without exposing it in session responses", async () => {
    const { auth, headers, accounts } = setup();
    const response = await auth.api.verifiedRegister({ body: { ...registration, phone: "3001234567" }, headers: await headers(), asResponse: true });
    expect(response.status).toBe(200);
    expect(await accounts.findByEmail(email)).toMatchObject({ phone: null, phoneInput: "3001234567", phoneNeedsReview: true, phoneVerified: false });
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith("omnibudget.session_token="))!.split(";")[0];
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    for (const field of ["phoneInput", "phoneCountry", "phoneNeedsReview", "phoneVerified"])
      expect(session?.user).not.toHaveProperty(field);
  });
  it("creates a profile and a persistent session, consumes the grant, and supports logout", async () => {
    const { auth, headers, database, accounts } = setup();
    const proof = await headers();
    const response = await auth.api.verifiedRegister({ body: registration, headers: proof, asResponse: true });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    const cookies = response.headers.getSetCookie();
    expect(cookies.some((value) => value.startsWith("omnibudget.session_token="))).toBe(true);
    expect(cookies.some((value) => value.startsWith("ob_email_verification=;") && value.includes("Max-Age=0"))).toBe(true);
    const cookie = cookies.find((value) => value.startsWith("omnibudget.session_token="))!.split(";")[0];
    const sessionHeaders = new Headers({ cookie, origin: "http://localhost:3000" });
    const session = await auth.api.getSession({ headers: sessionHeaders });
    expect(session?.user.email).toBe(email);
    expect(session?.user).not.toHaveProperty("passwordHash");
    expect(session?.user).not.toHaveProperty("phone");
    expect((await accounts.findByEmail(email))?.phoneVerified).toBe(false);
    expect((await accounts.findByEmail(email))?.defaultWorkspaceName).toBe("Home");
    expect(database.authSessions).toHaveLength(1);
    const replay = await auth.api.verifiedLogin({ body: { email, password: registration.password }, headers: proof, asResponse: true });
    expect(replay.status).toBe(401);
    await auth.api.signOut({ headers: sessionHeaders });
    expect(await auth.api.getSession({ headers: sessionHeaders })).toBeNull();
  });

  it("blocks login and registration without a browser-bound grant", async () => {
    const { auth } = setup();
    expect((await auth.api.verifiedRegister({ body: registration, asResponse: true })).status).toBe(401);
    expect((await auth.api.verifiedLogin({ body: { email, password: registration.password }, asResponse: true })).status).toBe(401);
  });

  it("rejects an email edited after verification", async () => {
    const { auth, headers, database } = setup();
    const response = await auth.api.verifiedRegister({ body: { ...registration, email: "someone@example.com" }, headers: await headers(), asResponse: true });
    expect(response.status).toBe(401);
    expect(database.users).toHaveLength(0);
  });

  it("requires a fresh OTP on another device and checks the password", async () => {
    const { auth, headers, database } = setup();
    await auth.api.verifiedRegister({ body: registration, headers: await headers() });
    const proof = await headers();
    expect((await auth.api.verifiedLogin({ body: { email, password: "wrong" }, headers: proof, asResponse: true })).status).toBe(401);
    expect((await auth.api.verifiedLogin({ body: { email, password: registration.password }, headers: proof, asResponse: true })).status).toBe(200);
    expect(database.authSessions).toHaveLength(2);
  });

  it("limits password attempts even when a grant remains valid", async () => {
    const { auth, headers } = setup();
    await auth.api.verifiedRegister({ body: registration, headers: await headers() });
    const proof = await headers();
    for (let i = 0; i < 5; i++) {
      expect((await auth.api.verifiedLogin({ body: { email, password: "wrong" }, headers: proof, asResponse: true })).status).toBe(401);
    }
    expect((await auth.api.verifiedLogin({ body: { email, password: registration.password }, headers: proof, asResponse: true })).status).toBe(429);
  });

  it("allows only one concurrent successful use of a grant", async () => {
    const { auth, headers, database } = setup();
    await auth.api.verifiedRegister({ body: registration, headers: await headers() });
    const proof = await headers();
    const responses = await Promise.all([1, 2].map(() => auth.api.verifiedLogin({ body: { email, password: registration.password }, headers: proof, asResponse: true })));
    expect(responses.map((value) => value.status).sort()).toEqual([200, 401]);
    expect(database.authSessions).toHaveLength(2);
  });
});
