"use client";

import {
  type FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import {
  OtpClientError,
  requestOtp,
  verifyOtp,
} from "@/modules/auth/client/otp-client";

import styles from "./access-flow.module.scss";

type AccessStep = "email" | "code";
type RequestStage = AccessStep | null;

export function AccessFlow() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const headingId = useId();
  const [step, setStep] = useState<AccessStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [pending, setPending] = useState<RequestStage>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  const busy = pending !== null;

  useEffect(() => () => activeRequest.current?.abort(), []);

  function requestErrorMessage(error: unknown) {
    if (error instanceof OtpClientError && t.has(`errors.${error.code}`)) {
      return t(`errors.${error.code}`);
    }

    return t(error instanceof TypeError
      ? "errors.network_error"
      : "errors.request_failed");
  }

  async function runRequest<T>(
    stage: Exclude<RequestStage, null>,
    action: (signal: AbortSignal) => Promise<T>,
  ): Promise<T | null> {
    if (activeRequest.current) {
      return null;
    }

    const request = new AbortController();
    activeRequest.current = request;
    setPending(stage);
    setStatusMessage("");

    try {
      return await action(request.signal);
    } catch (error) {
      if (!request.signal.aborted) {
        setStatusMessage(requestErrorMessage(error));
      }

      return null;
    } finally {
      if (activeRequest.current === request) {
        activeRequest.current = null;
        if (!request.signal.aborted) {
          setPending(null);
        }
      }
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submittedEmail = new FormData(event.currentTarget).get("email");

    if (typeof submittedEmail !== "string") {
      return;
    }

    const normalizedEmail = submittedEmail.trim();
    setEmail(normalizedEmail);
    const result = await runRequest(
      "email",
      (signal) => requestOtp(normalizedEmail, signal),
    );

    if (!result) {
      return;
    }

    setChallengeId(result.challengeId);
    setCode(result.developmentCode ?? "");
    setStatusMessage(result.developmentCode
      ? t("code.developmentCode", { code: result.developmentCode })
      : "");
    setStep("code");
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!challengeId) {
      returnToEmail();
      return;
    }

    const verified = await runRequest("code", async (signal) => {
      await verifyOtp(challengeId, email, code, signal);
      return true;
    });

    if (verified) {
      router.replace("/csv-import");
    }
  }

  function returnToEmail() {
    setCode("");
    setChallengeId("");
    setStatusMessage("");
    setStep("email");
  }

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      {step === "email" ? (
        <>
          <div className={styles.introduction}>
            <h1 id={headingId}>{t("email.title")}</h1>
            <p>{t("email.description")}</p>
          </div>

          <form key="email-form" className={styles.form} onSubmit={handleEmailSubmit}>
            <label htmlFor="access-email">{t("email.label")}</label>
            <input
              id="access-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t("email.placeholder")}
              defaultValue={email}
              disabled={busy}
              required
              autoFocus
            />
            <button type="submit" disabled={busy}>
              {pending === "email" ? t("email.pending") : t("email.submit")}
            </button>
          </form>

          <p className={styles.status} role="status" aria-live="polite">
            {statusMessage}
          </p>
        </>
      ) : (
        <>
          <div className={styles.introduction}>
            <h1 id={headingId}>{t("code.title")}</h1>
            <p>{t("code.description", { email })}</p>
          </div>

          <form key="code-form" className={styles.form} onSubmit={handleCodeSubmit}>
            <label htmlFor="access-code">{t("code.label")}</label>
            <input
              className={styles.codeInput}
              id="access-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              value={code}
              disabled={busy}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setStatusMessage("");
              }}
              required
              autoFocus
            />
            <button type="submit" disabled={busy}>
              {pending === "code" ? t("code.pending") : t("code.submit")}
            </button>
          </form>

          <button
            className={styles.textButton}
            type="button"
            disabled={busy}
            onClick={returnToEmail}
          >
            {t("code.changeEmail")}
          </button>

          <p className={styles.status} role="status" aria-live="polite">
            {statusMessage}
          </p>
        </>
      )}
    </section>
  );
}
