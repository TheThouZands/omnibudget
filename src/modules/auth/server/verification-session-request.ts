import { loadVerificationSessionService } from "./verification-session-runtime";
import { readVerificationSessionCookie } from "./verification-session-cookie";

type VerificationSessionService = Awaited<
  ReturnType<typeof loadVerificationSessionService>
>;
export type VerificationSessionServiceLoader = () => Promise<
  VerificationSessionService
>;

export class VerificationSessionRequiredError extends Error {
  readonly code = "email_verification_required";
  readonly status = 401;

  constructor() {
    super("email_verification_required");
    this.name = "VerificationSessionRequiredError";
  }
}

export async function findVerificationSessionForRequest(
  request: Request,
  loadService: VerificationSessionServiceLoader = loadVerificationSessionService,
) {
  const token = readVerificationSessionCookie(request);
  return (await loadService()).find(token);
}

export async function requireVerificationSession(
  request: Request,
  loadService: VerificationSessionServiceLoader = loadVerificationSessionService,
) {
  const session = await findVerificationSessionForRequest(request, loadService);

  if (!session) {
    throw new VerificationSessionRequiredError();
  }

  return session;
}
