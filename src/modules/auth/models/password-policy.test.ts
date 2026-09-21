import { describe, expect, it } from "vitest";
import { loginInput } from "./account-input";
import { newPasswordInput, passwordConfirmationInput, passwordRules } from "./password-policy";

describe("shared password policy", () => {
  it.each(["Abcdef1!", "Árboles1!", "Longer phrase with spaces 2?", "Ab1!" + "x".repeat(124)])("accepts all required character classes: %s", (password) => {
    expect(newPasswordInput.safeParse(password).success).toBe(true);
    expect(Object.values(passwordRules).every((rule) => rule.safeParse(password).success)).toBe(true);
  });
  it.each(["", "Abcde1!", "abcdefg1!", "ABCDEFG1!", "Abcdefgh!", "Abcdefg1 ", "Ab1!" + "x".repeat(125)])("rejects missing requirements: %s", (password) => {
    expect(newPasswordInput.safeParse(password).success).toBe(false);
  });
  it("does not trim, alter or normalize passwords", () => {
    expect(newPasswordInput.parse(" Abcdef1! ")).toBe(" Abcdef1! ");
    expect(passwordConfirmationInput.safeParse({ password: "Abcdef1!", confirmPassword: "Abcdef1! " }).success).toBe(false);
  });
  it("requires a nonempty exact confirmation", () => {
    expect(passwordConfirmationInput.safeParse({ password: "", confirmPassword: "" }).success).toBe(false);
    expect(passwordConfirmationInput.safeParse({ password: "Abcdef1!", confirmPassword: "Abcdef1!" }).success).toBe(true);
  });
  it("does not apply new-password rules to existing-account login", () => {
    expect(loginInput.safeParse({ email: "old@example.com", password: "old password" }).success).toBe(true);
  });
});
