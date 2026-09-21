import { randomBytes } from "node:crypto";

import { readEnv, requireEnv } from "@/lib/env";

import type { VerificationSessionRepository } from "../models/verification-session";
import { MemoryVerificationSessionRepository } from "../repositories/memory-verification-session-repository";
import { createVerificationSessionService } from "../services/verification-session-service";

type StoreMode = "memory" | "database";

const globalForVerificationSessions = globalThis as unknown as {
  verificationSessionMemoryRepository?: MemoryVerificationSessionRepository;
  verificationSessionDevelopmentHashSecret?: string;
};

export function verificationStoreMode(production: boolean): StoreMode {
  const configured = readEnv("VERIFICATION_SESSION_STORE_MODE")
    ?? readEnv("OTP_STORE_MODE")
    ?? (production ? "database" : "memory");

  if (configured !== "memory" && configured !== "database") {
    throw new Error(
      "VERIFICATION_SESSION_STORE_MODE must be one of: memory, database.",
    );
  }

  if (production && configured !== "database") {
    throw new Error("Production verification sessions require database storage.");
  }

  return configured;
}

function hashSecret(production: boolean) {
  const configured = readEnv("VERIFICATION_SESSION_HASH_SECRET");

  if (configured) {
    return configured;
  }

  if (production) {
    return requireEnv(
      ["VERIFICATION_SESSION_HASH_SECRET"],
      "verification session HMAC secret",
    );
  }

  globalForVerificationSessions.verificationSessionDevelopmentHashSecret ??=
    randomBytes(32).toString("hex");
  return globalForVerificationSessions.verificationSessionDevelopmentHashSecret;
}

async function repository(
  mode: StoreMode,
): Promise<VerificationSessionRepository> {
  if (mode === "memory") {
    globalForVerificationSessions.verificationSessionMemoryRepository ??=
      new MemoryVerificationSessionRepository();
    return globalForVerificationSessions.verificationSessionMemoryRepository;
  }

  const { DrizzleVerificationSessionRepository } = await import(
    "../repositories/drizzle-verification-session-repository"
  );
  return new DrizzleVerificationSessionRepository();
}

export async function loadVerificationSessionService() {
  const production = process.env.NODE_ENV === "production";

  return createVerificationSessionService({
    repository: await repository(verificationStoreMode(production)),
    hashSecret: hashSecret(production),
  });
}
