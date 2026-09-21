import { getCountries, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";
import { z } from "zod";

const email = z.email().trim().toLowerCase().max(320);
const password = z.string().min(12).max(128);
const countries = new Set<string>(getCountries());

export const loginInput = z.strictObject({ email, password: z.string().min(1).max(128) });

export const registrationInput = z.strictObject({
  email,
  password,
  username: z.string().trim().min(1).max(80),
  workspaceName: z.string().trim().min(1).max(100),
  country: z.string().refine((value) => value === "" || countries.has(value)),
  phone: z.string().trim().max(40),
}).transform((input, ctx) => {
  const phone = input.phone
    ? parsePhoneNumberFromString(input.phone, { defaultCountry: input.country as CountryCode || undefined, extract: false })
    : undefined;
  if (input.phone && (!phone?.isValid() || phone.ext)) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "invalid_phone" });
    return z.NEVER;
  }
  return { ...input, phone: phone?.number ?? "" };
});

export type RegistrationInput = z.infer<typeof registrationInput>;
