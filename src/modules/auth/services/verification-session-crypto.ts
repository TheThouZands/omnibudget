import {
  createHmac,
  randomBytes,
} from "node:crypto";

import { VERIFICATION_SESSION_POLICY } from "../models/verification-session";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateVerificationSessionToken() {
  return randomBytes(VERIFICATION_SESSION_POLICY.tokenBytes).toString("base64url");
}

export function isVerificationSessionToken(value: string) {
  return TOKEN_PATTERN.test(value);
}

export function digestVerificationSessionToken(token: string, secret: string) {
  return createHmac("sha256", secret)
    .update("omnibudget:email-verification-session:v1\0")
    .update(token)
    .digest("hex");
}
