import { OtpError } from "../models/otp";
import { loadOtpService } from "../server/otp-runtime";

const MAX_REQUEST_BYTES = 4 * 1024;
const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};

type OtpService = Awaited<ReturnType<typeof loadOtpService>>;
export type OtpServiceLoader = () => Promise<OtpService>;

class OtpRequestError extends Error {
  constructor(readonly status: number) {
    super("invalid_request");
    this.name = "OtpRequestError";
  }
}

async function readObject(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new OtpRequestError(415);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new OtpRequestError(413);
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
    throw new OtpRequestError(413);
  }

  try {
    const value: unknown = JSON.parse(text);

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new OtpRequestError(400);
    }

    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof OtpRequestError) {
      throw error;
    }

    throw new OtpRequestError(400);
  }
}

function exactStrings(
  object: Record<string, unknown>,
  fields: readonly string[],
) {
  const keys = Object.keys(object).sort();
  const expected = [...fields].sort();

  if (
    keys.length !== expected.length
    || keys.some((key, index) => key !== expected[index])
  ) {
    throw new OtpRequestError(400);
  }

  const values: Record<string, string> = {};
  for (const field of fields) {
    const value = object[field];

    if (typeof value !== "string") {
      throw new OtpRequestError(400);
    }

    values[field] = value;
  }

  return values;
}

function failure(error: unknown) {
  if (error instanceof OtpError) {
    return Response.json(
      { error: { code: error.code } },
      {
        status: error.status,
        headers: {
          ...PRIVATE_RESPONSE_HEADERS,
          ...(error.retryAfterSeconds
            ? { "Retry-After": String(error.retryAfterSeconds) }
            : {}),
        },
      },
    );
  }

  if (error instanceof OtpRequestError) {
    return Response.json(
      { error: { code: "invalid_request" } },
      { status: error.status, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }

  console.error("OTP processing failed", error);
  return Response.json(
    { error: { code: "processing_failed" } },
    { status: 500, headers: PRIVATE_RESPONSE_HEADERS },
  );
}

export async function issueOtpRequest(
  request: Request,
  loadService: OtpServiceLoader = loadOtpService,
) {
  try {
    const body = await readObject(request);
    const { email } = exactStrings(body, ["email"]);
    const result = await (await loadService()).issue(email);

    return Response.json(result, {
      status: 202,
      headers: PRIVATE_RESPONSE_HEADERS,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function verifyOtpRequest(
  request: Request,
  loadService: OtpServiceLoader = loadOtpService,
) {
  try {
    const body = await readObject(request);
    const { challengeId, email, code } = exactStrings(
      body,
      ["challengeId", "email", "code"],
    );
    await (await loadService()).verify(challengeId, email, code);

    return Response.json(
      { verified: true },
      { headers: PRIVATE_RESPONSE_HEADERS },
    );
  } catch (error) {
    return failure(error);
  }
}
