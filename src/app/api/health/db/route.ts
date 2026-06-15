import { NextResponse } from "next/server";
import { dbClient } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = performance.now();

  try {
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
