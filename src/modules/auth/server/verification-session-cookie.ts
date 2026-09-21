import {
  type IssuedVerificationSession,
  VERIFICATION_SESSION_POLICY,
} from "../models/verification-session";

const DEVELOPMENT_COOKIE_NAME = "ob_email_verification";
const PRODUCTION_COOKIE_NAME = "__Host-ob_email_verification";

export function clearVerificationSessionCookie(production = isProduction()) {
  return `${verificationSessionCookieName(production)}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${production ? "; Secure" : ""}`;
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function verificationSessionCookieName(
  production = isProduction(),
) {
  return production ? PRODUCTION_COOKIE_NAME : DEVELOPMENT_COOKIE_NAME;
}

export function readVerificationSessionCookie(
  request: Request,
  production = isProduction(),
) {
  const expectedName = verificationSessionCookieName(production);
  const header = request.headers.get("cookie");

  if (!header) {
    return undefined;
  }

  for (const segment of header.split(";")) {
    const separator = segment.indexOf("=");

    if (separator < 0 || segment.slice(0, separator).trim() !== expectedName) {
      continue;
    }

    try {
      return decodeURIComponent(segment.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function serializeVerificationSessionCookie(
  session: IssuedVerificationSession,
  production = isProduction(),
) {
  const maxAgeSeconds = VERIFICATION_SESSION_POLICY.lifetimeMs / 1000;
  const attributes = [
    `${verificationSessionCookieName(production)}=${session.token}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    `Expires=${session.expiresAt.toUTCString()}`,
    "HttpOnly",
    "SameSite=Strict",
    "Priority=High",
  ];

  if (production) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}
