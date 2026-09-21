import { getCountries } from "libphonenumber-js/min";
import { z } from "zod";
import { newPasswordInput, passwordConfirmationInput } from "./password-policy";

const email = z.email().trim().toLowerCase().max(320);
const countries = new Set<string>(getCountries());
const country = z.string().refine((value) => value === "" || countries.has(value));

export const loginInput = z.strictObject({ email, password: z.string().min(1).max(128) });

export const registrationInput = z.strictObject({
  email,
  password: newPasswordInput,
  confirmPassword: passwordConfirmationInput.shape.confirmPassword,
  username: z.string().trim().min(1).max(80),
  workspaceName: z.string().trim().min(1).max(100),
  country,
  phoneCountry: country.optional(),
  phone: z.string().trim().max(40),
}).refine((input) => passwordConfirmationInput.safeParse(input).success, { path: ["confirmPassword"], message: "password_mismatch" });

export type RegistrationInput = z.infer<typeof registrationInput>;
