import { randomBytes } from "node:crypto";

import { readEnv, requireEnv } from "@/lib/env";

import type {
  OtpChallengeRepository,
  OtpCodeSender,
} from "../models/otp";
import { MemoryOtpRepository } from "../repositories/memory-otp-repository";
import { createOtpService } from "../services/otp-service";

type StoreMode = "memory" | "database";
type DeliveryMode = "emulated" | "smtp";

const globalForOtp = globalThis as unknown as {
  otpMemoryRepository?: MemoryOtpRepository;
  otpDevelopmentHashSecret?: string;
  otpSmtpSender?: OtpCodeSender;
};

function mode<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = readEnv(key) ?? fallback;

  if (!allowed.includes(value as T)) {
    throw new Error(`${key} must be one of: ${allowed.join(", ")}.`);
  }

  return value as T;
}

function runtimeModes() {
  const production = process.env.NODE_ENV === "production";
  const store = mode<StoreMode>(
    "OTP_STORE_MODE",
    ["memory", "database"],
    production ? "database" : "memory",
  );
  const delivery = mode<DeliveryMode>(
    "OTP_DELIVERY_MODE",
    ["emulated", "smtp"],
    production ? "smtp" : "emulated",
  );

  if (production && (store !== "database" || delivery !== "smtp")) {
    throw new Error(
      "Production OTP requires database storage and SMTP delivery.",
    );
  }

  return { production, store, delivery };
}

function hashSecret(production: boolean) {
  const configured = readEnv("OTP_HASH_SECRET");

  if (configured) {
    return configured;
  }

  if (production) {
    return requireEnv(["OTP_HASH_SECRET"], "OTP HMAC secret");
  }

  globalForOtp.otpDevelopmentHashSecret ??= randomBytes(32).toString("hex");
  return globalForOtp.otpDevelopmentHashSecret;
}

async function repository(store: StoreMode): Promise<OtpChallengeRepository> {
  if (store === "memory") {
    globalForOtp.otpMemoryRepository ??= new MemoryOtpRepository();
    return globalForOtp.otpMemoryRepository;
  }

  const { DrizzleOtpRepository } = await import(
    "../repositories/drizzle-otp-repository"
  );
  return new DrizzleOtpRepository();
}

async function sender(delivery: DeliveryMode): Promise<OtpCodeSender> {
  if (delivery === "emulated") {
    const { developmentOtpSender } = await import(
      "../services/development-otp-sender"
    );
    return developmentOtpSender;
  }

  if (!globalForOtp.otpSmtpSender) {
    const { createPurelymailOtpSender } = await import(
      "../services/purelymail-otp-sender"
    );
    const user = requireEnv(
      ["PURELYMAIL_SMTP_USER"],
      "Purelymail SMTP user",
    );
    globalForOtp.otpSmtpSender = createPurelymailOtpSender({
      user,
      password: requireEnv(
        ["PURELYMAIL_SMTP_PASSWORD"],
        "Purelymail SMTP password or app password",
      ),
      from: readEnv("OTP_EMAIL_FROM") ?? user,
    });
  }

  return globalForOtp.otpSmtpSender;
}

export async function loadOtpService() {
  const modes = runtimeModes();
  const [otpRepository, otpSender] = await Promise.all([
    repository(modes.store),
    sender(modes.delivery),
  ]);

  return createOtpService({
    repository: otpRepository,
    sender: otpSender,
    hashSecret: hashSecret(modes.production),
  });
}
