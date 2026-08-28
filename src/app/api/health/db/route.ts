import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = performance.now();

  try {
    // Public, stateless tools must build without configuring the optional database.
    const { dbClient } = await import("@/db");
    const rows = await dbClient`select 1 as ok`;
    const result = rows[0] as { ok?: number } | undefined;

    return NextResponse.json({
      ok: result?.ok === 1,
      latencyMs: Math.round(performance.now() - startedAt),
    });
  } catch (error) {
    console.error("Database health check failed", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown database error"
            : "Database health check failed",
      },
      { status: 500 },
    );
  }
}
