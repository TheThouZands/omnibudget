import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";
import type { RegistrationInput } from "./account-input";

/** Normalize optional contact data, never evidence of ownership or verified identity. */
export function registrationPhone(input: Pick<RegistrationInput, "phone" | "country" | "phoneCountry">) {
  const phoneInput = input.phone.trim() || null;
  // An explicit empty dialing region means "unknown", even with a profile country.
  const region = (input.phoneCountry ?? input.country) || null;
  const candidate = phoneInput?.replace(/^00/, "+");
  const parsed = candidate
    ? parsePhoneNumberFromString(candidate, { defaultCountry: region as CountryCode | undefined, extract: false })
    : undefined;
  const valid = Boolean(parsed?.isValid() && !parsed.ext);

  return {
    phoneInput,
    phone: valid ? parsed!.number : null,
    phoneCountry: valid ? parsed!.country ?? null : region,
    phoneNeedsReview: Boolean(phoneInput && !valid),
    // TODO: Only a future server-side phone verification service may set this true.
    phoneVerified: false,
  };
}
