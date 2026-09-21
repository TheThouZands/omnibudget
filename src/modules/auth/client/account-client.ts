export type AccessStatus =
  | { step: "email" | "authenticated" }
  | { step: "login" | "register"; email: string };

export class AccountClientError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export async function accountRequest(
  path: string,
  method: string,
  body?: Record<string, string>,
  signal?: AbortSignal,
) {
  const response = await fetch(`/api/auth/${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const code =
      result &&
      typeof result === "object" &&
      "code" in result &&
      typeof result.code === "string"
        ? result.code
        : "request_failed";
    throw new AccountClientError(code);
  }
  return result;
}

export async function readAccessStatus(
  signal?: AbortSignal,
): Promise<AccessStatus> {
  const result = await accountRequest("access", "GET", undefined, signal);
  if (result && typeof result === "object" && "step" in result) {
    if (result.step === "email" || result.step === "authenticated")
      return { step: result.step };
    if (
      (result.step === "login" || result.step === "register") &&
      "email" in result &&
      typeof result.email === "string"
    ) {
      return { step: result.step, email: result.email };
    }
  }
  throw new AccountClientError("request_failed");
}

export async function submitAccount(
  step: "login" | "register",
  body: Record<string, string>,
  signal?: AbortSignal,
) {
  const result = await accountRequest(step, "POST", body, signal);
  if (
    !result ||
    typeof result !== "object" ||
    !("success" in result) ||
    result.success !== true
  ) {
    throw new AccountClientError("request_failed");
  }
}
