import { APIError } from "better-auth/api";
import { loadAccountRuntime, findAccountSession } from "../server/account-runtime";
import { clearVerificationSessionCookie, readVerificationSessionCookie } from "../server/verification-session-cookie";
import { readAccountBody } from "../server/request-body";
import { loginInput, registrationInput } from "../models/account-input";

const privateHeaders = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff" };

export function accountController(loadRuntime = loadAccountRuntime) {
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: privateHeaders });

  async function execute(request: Request, operation: "status" | "reset" | "login" | "register" | "logout") {
    try {
      const origin = new URL(request.url).origin;
      if (operation !== "status" && (
        request.headers.get("origin") !== origin
        || request.headers.get("sec-fetch-site") === "cross-site"
      )) return json({ code: "invalid_origin" }, 403);

      const runtime = await loadRuntime(origin);
      const token = readVerificationSessionCookie(request);
      if (operation === "status") {
        if (await findAccountSession(request.headers, runtime)) return json({ step: "authenticated" });
        const grant = await runtime.verification.find(token);
        if (!grant) return json({ step: "email" });
        const user = await runtime.accounts.findByEmail(grant.email);
        return json({ step: user ? "login" : "register", email: grant.email });
      }
      if (operation === "reset" || operation === "logout") {
        await runtime.verification.revoke(token);
        const response = operation === "logout"
          ? await runtime.auth.api.signOut({ headers: request.headers, asResponse: true })
          : json({ success: true });
        response.headers.append("set-cookie", clearVerificationSessionCookie());
        for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
        return response;
      }
      // Check the browser's proof before parsing credentials or looking up an account.
      if (!await runtime.verification.find(token)) return json({ code: "email_verification_required" }, 401);
      if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return json({ code: "invalid_input" }, 415);
      let body;
      try { body = await readAccountBody(request); } catch (error) {
        return json({ code: "invalid_input" }, error instanceof Error && error.message === "body_too_large" ? 413 : 400);
      }
      let response: Response;
      if (operation === "login") {
        const parsed = loginInput.safeParse(body);
        if (!parsed.success) return json({ code: "invalid_input" }, 400);
        response = await runtime.auth.api.verifiedLogin({ body: parsed.data, headers: request.headers, asResponse: true });
      } else {
        const parsed = registrationInput.safeParse(body);
        if (!parsed.success) return json({ code: parsed.error.issues.some((issue) => issue.path[0] === "phone") ? "invalid_phone" : "invalid_input" }, 400);
        response = await runtime.auth.api.verifiedRegister({ body: parsed.data, headers: request.headers, asResponse: true });
      }
      for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
      return response;
    } catch (error) {
      if (error instanceof APIError) return json({ code: error.body?.code ?? "invalid_input" }, error.statusCode);
      // Database errors can include query parameters. Do not log credentials or profile data.
      console.error("Account request failed", error instanceof Error ? error.name : "UnknownError");
      return json({ code: "processing_failed" }, 500);
    }
  }
  return {
    status: (request: Request) => execute(request, "status"),
    reset: (request: Request) => execute(request, "reset"),
    login: (request: Request) => execute(request, "login"),
    register: (request: Request) => execute(request, "register"),
    logout: (request: Request) => execute(request, "logout"),
  };
}
