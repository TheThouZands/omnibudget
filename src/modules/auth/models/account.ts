import type { RegistrationInput } from "./account-input";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image: string | null;
  passwordHash: string;
  country: string | null;
  phone: string | null;
  phoneVerified: boolean;
  defaultWorkspaceName: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export interface AccountRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  create(input: RegistrationInput, passwordHash: string): Promise<AuthUser>;
  attempt(verificationSessionId: string, expiresAt: Date): Promise<boolean>;
}
