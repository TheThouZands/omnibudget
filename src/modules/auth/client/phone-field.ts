import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

/** Split complete saved international numbers for display, without validating ownership. */
export function splitPhoneInput(value: string, country: CountryCode | "") {
  const original = { number: value, country };
  const candidate = value.trim().replace(/^00/, "+");
  const parsed = parsePhoneNumberFromString(candidate, { defaultCountry: country || undefined, extract: false });
  if (!parsed?.isPossible() || parsed.ext) return original;

  const digits = candidate.replace(/\D/g, "");
  const hasPrefix = candidate.startsWith("+") ||
    Boolean(country && digits === `${parsed.countryCallingCode}${parsed.nationalNumber}`);
  if (!hasPrefix) return original;

  // Non-geographic numbers have no country entry; keep their explicit prefix in the input.
  return parsed.country
    ? { number: parsed.nationalNumber.toString(), country: parsed.country }
    : { number: candidate, country: "" as const };
}
