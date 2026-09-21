import { describe, expect, it } from "vitest";
import { passwordStrength } from "./password-strength";

describe("zxcvbn password strength", () => {
  it("does not mistake composition compliance for strength", () => {
    expect(passwordStrength("Password1!", "person@example.com")).toBeLessThan(
      3,
    );
  });
  it("recognizes long, less predictable passwords", () => {
    expect(
      passwordStrength("Cactus!Bruma8Linterna#Orbitas", "person@example.com"),
    ).toBeGreaterThanOrEqual(3);
  });
  it("penalizes account-specific words", () => {
    expect(
      passwordStrength("Omnibudget1!", "omnibudget@example.com"),
    ).toBeLessThan(3);
  });
  it("returns only a strength score", () => {
    expect(passwordStrength("", "person@example.com")).toBe(0);
  });
});
