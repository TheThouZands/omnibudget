import { describe, expect, it } from "vitest";
import { splitPhoneInput } from "./phone-field";

describe("phone field display", () => {
  it.each([
    ["+57 300 123 4567", "3001234567", "CO"],
    ["573001234567", "3001234567", "CO"],
    ["+44 20 7946 0018", "2079460018", "GB"],
    ["0044 20 7946 0018", "2079460018", "GB"],
  ] as const)("separates the prefix from %s", (value, number, country) => {
    expect(splitPhoneInput(value, "CO")).toEqual({ number, country });
  });

  it("recognizes an international number without a selected country", () => {
    expect(splitPhoneInput("+1 202 555 0123", "")).toEqual({ number: "2025550123", country: "US" });
  });

  it.each(["3001234567", "123", "+44", "+1 202 555 0123 ext. 4", ""])("does not alter national or incomplete input: %s", (number) => {
    expect(splitPhoneInput(number, "CO")).toEqual({ number, country: "CO" });
  });

  it("does not guess a prefix for digits without a region", () => {
    expect(splitPhoneInput("573001234567", "")).toEqual({ number: "573001234567", country: "" });
  });

  it("retains a non-geographic international prefix", () => {
    expect(splitPhoneInput("+80012345678", "CO")).toEqual({ number: "+80012345678", country: "" });
  });
});
