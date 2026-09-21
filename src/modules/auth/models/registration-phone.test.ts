import { describe, expect, it } from "vitest";
import { registrationInput } from "./account-input";
import { registrationPhone } from "./registration-phone";

describe("optional registration phone", () => {
  it.each([
    ["3001234567", "CO", undefined, "+573001234567", "CO"],
    ["573001234567", "CO", "CO", "+573001234567", "CO"],
    ["+57 300 123 4567", "CO", "CO", "+573001234567", "CO"],
    ["+44 20 7946 0018", "CO", "CO", "+442079460018", "GB"],
    ["0044 20 7946 0018", "CO", "CO", "+442079460018", "GB"],
    ["020 7946 0018", "CO", "GB", "+442079460018", "GB"],
    ["2025550123", "US", "US", "+12025550123", "US"],
    ["12025550123", "US", "US", "+12025550123", "US"],
    ["+1 202 555 0123", "", "", "+12025550123", "US"],
  ])("normalizes %s without duplicating the prefix", (phone, country, phoneCountry, expected, region) => {
    expect(registrationPhone({ phone, country: country!, phoneCountry })).toEqual({
      phoneInput: phone, phone: expected, phoneCountry: region, phoneNeedsReview: false, phoneVerified: false,
    });
  });

  it.each([
    { phone: "3001234567", country: "" },
    { phone: "3001234567", country: "CO", phoneCountry: "" },
    { phone: "123", country: "CO" },
    { phone: "+1 202 555 0123 ext. 4", country: "" },
    { phone: "Call me later", country: "" },
  ])("preserves unresolved input without treating it as verified: $phone", (input) => {
    expect(registrationPhone(input)).toMatchObject({ phoneInput: input.phone, phone: null, phoneNeedsReview: true, phoneVerified: false });
  });

  it("does not flag an omitted phone", () => {
    expect(registrationPhone({ phone: "", country: "CO" })).toMatchObject({ phoneInput: null, phone: null, phoneNeedsReview: false });
  });

  const input = { email: "person@example.com", password: "a long test password", username: "Person", workspaceName: "Home", country: "", phone: "123" };
  it("accepts unresolved phone input and can be parsed at both HTTP boundaries", () => {
    const parsed = registrationInput.parse({ ...input, phoneCountry: "GB" });
    expect(registrationInput.parse(parsed)).toEqual(parsed);
    expect(parsed.phone).toBe("123");
  });
  it.each([{ phoneCountry: "XX" }, { phoneVerified: true }, { phoneNeedsReview: false }, { phone: "1".repeat(41) }])("rejects invalid regions and client-controlled status flags", (change) => {
    expect(registrationInput.safeParse({ ...input, ...change }).success).toBe(false);
  });
});
