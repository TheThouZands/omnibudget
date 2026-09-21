import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Keep the live checklist and the server's acceptance rules in one place.
export const passwordRules = {
  length: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
  uppercase: z.string().regex(/\p{Lu}/u),
  lowercase: z.string().regex(/\p{Ll}/u),
  number: z.string().regex(/[0-9]/),
  special: z.string().regex(/[\p{P}\p{S}]/u),
};

export type PasswordRule = keyof typeof passwordRules;
export const passwordRuleNames = Object.keys(passwordRules) as PasswordRule[];

export const newPasswordInput = z.string().superRefine((password, context) => {
  for (const rule of passwordRuleNames) {
    if (!passwordRules[rule].safeParse(password).success) {
      context.addIssue({ code: "custom", message: rule });
    }
  }
});

export const passwordConfirmationInput = z.object({
  password: z.string(),
  confirmPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
}).refine(({ password, confirmPassword }) => password === confirmPassword, {
  path: ["confirmPassword"], message: "password_mismatch",
});
