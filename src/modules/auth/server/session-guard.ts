import { findAccountSession, loadAccountRuntime } from "./account-runtime";

export async function protectAccountRoute(
  request: Request,
  handler: (request: Request) => Promise<Response>,
) {
  const runtime = await loadAccountRuntime(new URL(request.url).origin);
  if (!(await findAccountSession(request.headers, runtime))) {
    return Response.json(
      { error: { code: "authentication_required" } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return handler(request);
}
