import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { registrationInput } from "../models/account-input";

describe("account credentials", () => {
  it("uses salted Argon2id and rejects incorrect or corrupt hashes", async () => {
    const hash = await hashPassword("a long test password");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword("a long test password", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
    expect(await verifyPassword("password", "invalid")).toBe(false);
    expect(await hashPassword("a long test password")).not.toBe(hash);
  });

  const input = { email: "person@example.com", password: "A long test password 1!", username: "My family", workspaceName: "Household", country: "", phone: "" };

  it("accepts display names and optional profile fields", () => {
    expect(registrationInput.parse(input)).toEqual(input);
  });

  it("preserves phone input for server-side normalization", () => {
    expect(registrationInput.parse({ ...input, country: "US", phone: "2025550123" }).phone).toBe("2025550123");
  });

  it.each([
    { workspaceName: " " }, { username: " " }, { country: "ZZ" },
    { phone: "1".repeat(41) }, { password: "short" }, { phoneVerified: true },
    { emailVerified: true }, { password: "x".repeat(129) },
  ])("rejects invalid or client-controlled protected fields: %o", (change) => {
    expect(registrationInput.safeParse({ ...input, ...change }).success).toBe(false);
  });
});
