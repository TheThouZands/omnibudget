import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

import { OTP_POLICY } from "../models/otp";

type DigestInput = {
  challengeId: string;
  email: string;
  code: string;
  secret: string;
};

export function generateOtpCode(
  draw = (maximum: number) => randomInt(maximum),
): string {
  const maximum = 10 ** OTP_POLICY.codeDigits;
  return draw(maximum).toString().padStart(OTP_POLICY.codeDigits, "0");
}

export function digestOtp({ challengeId, email, code, secret }: DigestInput) {
  return createHmac("sha256", secret)
    .update(challengeId)
    .update("\0")
    .update(email)
    .update("\0")
    .update(code)
    .digest("hex");
}

export function otpDigestMatches(candidate: string, stored: string) {
  const candidateBytes = Buffer.from(candidate, "hex");
  const storedBytes = Buffer.from(stored, "hex");

  return candidateBytes.length === storedBytes.length
    && candidateBytes.length > 0
    && timingSafeEqual(candidateBytes, storedBytes);
}
