import { betterAuth } from "better-auth/minimal";
import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { AccountRepository } from "../models/account";
import { loginInput, registrationInput } from "../models/account-input";
import { hashPassword, verifyPassword } from "../services/password";
import type { createVerificationSessionService } from "../services/verification-session-service";
import { verificationSessionCookieName, readVerificationSessionCookie } from "./verification-session-cookie";

type VerificationService = ReturnType<typeof createVerificationSessionService>;
type Dependencies = {
  accounts: AccountRepository;
  verification: VerificationService;
};

function verifiedAccountFlow({ accounts, verification }: Dependencies) {
  type Context = Parameters<typeof setSessionCookie>[0];

  async function grantFor(headers: Headers | undefined, email: string) {
    const request = new Request("http://internal", { headers });
    const token = readVerificationSessionCookie(request);
    const grant = await verification.find(token);
    if (!grant || grant.email !== email) {
      throw new APIError("UNAUTHORIZED", { code: "email_verification_required", message: "Verify your email first." });
    }
    if (!await accounts.attempt(grant.id, grant.expiresAt)) {
      throw new APIError("TOO_MANY_REQUESTS", { code: "too_many_attempts", message: "Verify your email again." });
    }
    return token;
  }

  async function consume(token: string | undefined) {
    if (!await verification.consume(token)) {
      throw new APIError("UNAUTHORIZED", { code: "email_verification_required", message: "Verify your email again." });
    }
  }

  async function finish(ctx: Context, userId: string) {
    const user = await ctx.context.internalAdapter.findUserById(userId);
    if (!user) throw new APIError("UNAUTHORIZED", { message: "Account unavailable." });
    const previousToken = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
    const session = await ctx.context.internalAdapter.createSession(user.id);
    if (previousToken) await ctx.context.internalAdapter.deleteSession(previousToken);
    await setSessionCookie(ctx, { session, user });
    ctx.setCookie(verificationSessionCookieName(), "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    return { success: true };
  }

  return {
    id: "verified-account-flow",
    endpoints: {
      verifiedLogin: createAuthEndpoint.serverOnly({ method: "POST", body: loginInput }, async (ctx) => {
        const token = await grantFor(ctx.headers, ctx.body.email);
        const user = await accounts.findByEmail(ctx.body.email);
        if (!user || user.deletedAt || !user.emailVerified || !await verifyPassword(ctx.body.password, user.passwordHash)) {
          throw new APIError("UNAUTHORIZED", { code: "invalid_credentials", message: "Check your password." });
        }
        await consume(token);
        return finish(ctx, user.id);
      }),
      verifiedRegister: createAuthEndpoint.serverOnly({ method: "POST", body: registrationInput }, async (ctx) => {
        const token = await grantFor(ctx.headers, ctx.body.email);
        if (await accounts.findByEmail(ctx.body.email)) {
          throw new APIError("CONFLICT", { code: "account_exists", message: "This account already exists." });
        }
        const passwordHash = await hashPassword(ctx.body.password);
        await consume(token);
        const user = await accounts.create(ctx.body, passwordHash);
        return finish(ctx, user.id);
      }),
    },
  } satisfies BetterAuthPlugin;
}

export function createAccountAuth(options: Dependencies & {
  database: BetterAuthOptions["database"];
  secret: string;
  baseURL: string;
  production: boolean;
}) {
  return betterAuth({
    appName: "Omnibudget", secret: options.secret, baseURL: options.baseURL,
    database: options.database,
    advanced: { cookiePrefix: "omnibudget", useSecureCookies: options.production, database: { generateId: "uuid" }, defaultCookieAttributes: { sameSite: "strict" } },
    user: { modelName: "users", additionalFields: { passwordHash: { type: "string", required: true, input: false, returned: false } } },
    account: { modelName: "authAccounts" },
    verification: { modelName: "authVerifications" },
    session: {
      modelName: "authSessions", expiresIn: 60 * 60 * 24 * 30,
      disableSessionRefresh: true, cookieCache: { enabled: false },
    },
    // Only the server-only endpoints above create sessions. No generic auth handler is exposed.
    emailAndPassword: { enabled: false },
    plugins: [verifiedAccountFlow(options)],
  });
}
