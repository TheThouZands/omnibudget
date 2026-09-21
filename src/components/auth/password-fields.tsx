"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import {
  newPasswordInput,
  passwordConfirmationInput,
  passwordRuleNames,
  passwordRules,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/modules/auth/models/password-policy";
import type {
  StrengthReply,
  StrengthRequest,
} from "@/modules/auth/client/password-strength.worker";
import { PasswordHint } from "./password-hint";
import styles from "./password-fields.module.scss";
import formStyles from "./access-flow.module.scss";

export function PasswordFields({
  disabled,
  email,
}: {
  disabled: boolean;
  email: string;
}) {
  const t = useTranslations("Auth");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [focused, setFocused] = useState<HTMLInputElement | null>(null);
  const [strength, setStrength] = useState<{
    id: number;
    score: number | null;
  } | null>(null);
  const [strengthUnavailable, setStrengthUnavailable] = useState(false);
  const worker = useRef<Worker | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const instance = new Worker(
      new URL(
        "../../modules/auth/client/password-strength.worker.ts",
        import.meta.url,
      ),
      { type: "module" },
    );
    worker.current = instance;
    instance.onmessage = (event: MessageEvent<StrengthReply>) => {
      if (event.data.id === requestId.current) setStrength(event.data);
    };
    instance.onerror = () => setStrengthUnavailable(true);
    return () => {
      instance.terminate();
      worker.current = null;
    };
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    worker.current?.postMessage({
      id,
      password,
      email,
    } satisfies StrengthRequest);
  }, [password, email]);

  const matches = passwordConfirmationInput.safeParse({
    password,
    confirmPassword: confirmation,
  }).success;
  const valid = newPasswordInput.safeParse(password).success;
  const score = password && !strengthUnavailable ? strength?.score : null;
  const strengthLabel = !password
    ? t("passwordSetup.empty")
    : strengthUnavailable || strength?.score === null
      ? t("passwordSetup.unavailable")
      : score == null
        ? t("passwordSetup.calculating")
        : t(`passwordSetup.strength.${score}`);

  function dismiss(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && focused) {
      event.preventDefault();
      event.stopPropagation();
      setFocused(null);
    }
  }

  const isPassword = focused?.name === "password";
  const hintId = isPassword
    ? "access-password-hint"
    : "access-password-confirmation-hint";
  return (
    <>
      <label htmlFor="access-password">
        {t("account.password")}
        <span aria-hidden="true" className={formStyles.requiredMarker}>
          *
        </span>
      </label>
      <input
        id="access-password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        disabled={disabled}
        value={password}
        aria-invalid={password ? !valid : undefined}
        aria-describedby={focused?.name === "password" ? hintId : undefined}
        onChange={(event) => {
          setPassword(event.target.value);
          requestId.current++;
        }}
        onFocus={(event) => setFocused(event.currentTarget)}
        onBlur={() => setFocused(null)}
        onKeyDown={dismiss}
      />
      <label htmlFor="access-confirm-password">
        {t("passwordSetup.confirmLabel")}
        <span aria-hidden="true" className={formStyles.requiredMarker}>
          *
        </span>
      </label>
      <input
        id="access-confirm-password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        maxLength={PASSWORD_MAX_LENGTH}
        disabled={disabled}
        value={confirmation}
        aria-invalid={confirmation ? !matches : undefined}
        aria-describedby={
          focused?.name === "confirmPassword" ? hintId : undefined
        }
        onChange={(event) => setConfirmation(event.target.value)}
        onFocus={(event) => setFocused(event.currentTarget)}
        onBlur={() => setFocused(null)}
        onKeyDown={dismiss}
      />
      {focused && (
        <PasswordHint key={focused.name} id={hintId} anchor={focused}>
          {isPassword ? (
            <>
              <div
                className={styles.meter}
                role="meter"
                aria-label={t("passwordSetup.strengthLabel")}
                aria-valuemin={0}
                aria-valuemax={4}
                aria-valuenow={score ?? 0}
                aria-valuetext={strengthLabel}
                data-score={score ?? "empty"}
              >
                <span
                  style={{
                    width: score == null ? "0%" : `${(score + 1) * 20}%`,
                  }}
                />
              </div>
              <p className={styles.strength} role="status" aria-live="polite">
                {strengthLabel}
              </p>
              <ul
                className={styles.requirements}
                aria-label={t("passwordSetup.requirements")}
              >
                {passwordRuleNames.map((rule) => {
                  const met = passwordRules[rule].safeParse(password).success;
                  return (
                    <li key={rule} data-met={met}>
                      <span aria-hidden="true">{met ? "✓" : "×"}</span>
                      <span className={styles.srOnly}>
                        {t(met ? "passwordSetup.met" : "passwordSetup.unmet")}
                        :{" "}
                      </span>
                      {t(`passwordSetup.rules.${rule}`)}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <ul className={styles.requirements} aria-live="polite">
              <li data-met={matches}>
                <span aria-hidden="true">{matches ? "✓" : "×"}</span>
                <span className={styles.srOnly}>
                  {t(matches ? "passwordSetup.met" : "passwordSetup.unmet")}
                  :{" "}
                </span>
                {t("passwordSetup.match")}
              </li>
            </ul>
          )}
        </PasswordHint>
      )}
    </>
  );
}
