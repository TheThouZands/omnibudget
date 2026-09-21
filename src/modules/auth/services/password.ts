import { argon2id, hash, verify } from "argon2";

const options = { type: argon2id, memoryCost: 65_536, timeCost: 3, parallelism: 1, hashLength: 32 };

export function hashPassword(password: string) {
  return hash(password, options);
}

export async function verifyPassword(password: string, passwordHash: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
