export type OtpClientErrorCode =
  | "invalid_request"
  | "rate_limited"
  | "delivery_failed"
  | "code_invalid_or_expired"
  | "processing_failed"
  | "request_failed";

export class OtpClientError extends Error {
  constructor(
    readonly code: OtpClientErrorCode,
    readonly status: number,
  ) {
    super(code);
    this.name = "OtpClientError";
  }
}

export type RequestedOtp = {
  challengeId: string;
  expiresAt: string;
  developmentCode?: string;
};

const SERVER_ERROR_CODES = new Set<OtpClientErrorCode>([
  "invalid_request",
  "rate_limited",
  "delivery_failed",
  "code_invalid_or_expired",
  "processing_failed",
]);

async function responsePayload(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function serverErrorCode(payload: unknown): OtpClientErrorCode {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return "request_failed";
  }

  const error = payload.error;
  if (!error || typeof error !== "object" || !("code" in error)) {
    return "request_failed";
  }

  return typeof error.code === "string"
    && SERVER_ERROR_CODES.has(error.code as OtpClientErrorCode)
    ? error.code as OtpClientErrorCode
    : "request_failed";
}

async function postOtp(
  endpoint: "request" | "verify",
  body: Record<string, string>,
  signal?: AbortSignal,
) {
  const response = await fetch(`/api/auth/otp/${endpoint}`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const payload = await responsePayload(response);

  if (!response.ok) {
    throw new OtpClientError(serverErrorCode(payload), response.status);
  }

  return payload;
}

function isRequestedOtp(payload: unknown): payload is RequestedOtp {
  if (
    !payload
    || typeof payload !== "object"
    || !("challengeId" in payload)
    || typeof payload.challengeId !== "string"
    || !("expiresAt" in payload)
    || typeof payload.expiresAt !== "string"
  ) {
    return false;
  }

  if (
    "developmentCode" in payload
    && (
      typeof payload.developmentCode !== "string"
      || !/^\d{6}$/.test(payload.developmentCode)
    )
  ) {
    return false;
  }

  return !Number.isNaN(Date.parse(payload.expiresAt));
}

export async function requestOtp(email: string, signal?: AbortSignal) {
  const payload = await postOtp("request", { email }, signal);

  if (!isRequestedOtp(payload)) {
    throw new OtpClientError("request_failed", 502);
  }

  return payload;
}

export async function verifyOtp(
  challengeId: string,
  email: string,
  code: string,
  signal?: AbortSignal,
) {
  const payload = await postOtp(
    "verify",
    { challengeId, email, code },
    signal,
  );

  if (
    !payload
    || typeof payload !== "object"
    || !("verified" in payload)
    || payload.verified !== true
  ) {
    throw new OtpClientError("request_failed", 502);
  }
}
