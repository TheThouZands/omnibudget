"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getCountries, type CountryCode } from "libphonenumber-js/min";
import {
  AccountClientError,
  accountRequest,
  submitAccount,
} from "@/modules/auth/client/account-client";
import styles from "./access-flow.module.scss";
import { PhoneField } from "./phone-field";
import { PASSWORD_MAX_LENGTH } from "@/modules/auth/models/password-policy";
import { registrationInput } from "@/modules/auth/models/account-input";
import { PasswordFields } from "./password-fields";

const requiredMarker = <span className={styles.requiredMarker} aria-hidden="true">*</span>;

type Props = {
  step: "login" | "register";
  email: string;
  headingId: string;
  onSuccess: () => void;
  onChangeEmail: () => void;
};

export function AccountForm({
  step,
  email,
  headingId,
  onSuccess,
  onChangeEmail,
}: Props) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [country, setCountry] = useState<CountryCode | "">("");
  const active = useRef<AbortController | null>(null);
  const registration = step === "register";
  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return getCountries()
      .map((code) => ({ code, name: names.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);
  useEffect(() => () => active.current?.abort(), []);

  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (active.current) return;
    const request = new AbortController();
    active.current = request;
    setBusy(true);
    setError("");
    try {
      await action(request.signal);
    } catch (cause) {
      if (!request.signal.aborted) {
        const code =
          cause instanceof AccountClientError ? cause.code : "network_error";
        setError(
          t(
            t.has(`errors.${code}`)
              ? `errors.${code}`
              : "errors.request_failed",
          ),
        );
      }
    } finally {
      if (!request.signal.aborted) {
        active.current = null;
        setBusy(false);
      }
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const fields: Record<string, string> = {};
    for (const [key, value] of data.entries())
      if (typeof value === "string") fields[key] = value;
    if (registration) {
      const parsed = registrationInput.safeParse(fields);
      if (!parsed.success) {
        const field = parsed.error.issues[0]?.path[0];
        setError(t(field === "password" ? "errors.invalid_password" : field === "confirmPassword" ? "errors.password_mismatch" : "errors.invalid_input"));
        const input = typeof field === "string" ? event.currentTarget.elements.namedItem(field) : null;
        if (input instanceof HTMLElement) input.focus();
        return;
      }
    }
    await run(async (signal) => {
      await submitAccount(step, fields, signal);
      onSuccess();
    });
  }

  return (
    <>
      <div className={styles.introduction}>
        <h1 id={headingId}>{t(`${step}.title`)}</h1>
        <p>{t(`${step}.description`)}</p>
      </div>
      <form
        id={`access-${step}-form`}
        name={`access-${step}`}
        method="post"
        action={`/api/auth/${step}`}
        autoComplete="on"
        className={styles.form}
        onSubmit={submit}
        onChange={() => setError("")}
        aria-busy={busy}
      >
        <label htmlFor="access-email">{t("email.label")}{registration && requiredMarker}</label>
        <input
          id="access-email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          readOnly
          required
          autoCapitalize="none"
          spellCheck={false}
        />
        {registration && (
          <>
            <label htmlFor="access-username">{t("register.username")}{requiredMarker}</label>
            <input
              id="access-username"
              name="username"
              type="text"
              autoComplete="name"
              required
              maxLength={80}
              disabled={busy}
              autoFocus
            />
          </>
        )}
        {registration ? <PasswordFields disabled={busy} email={email} /> : <>
        <label htmlFor="access-password">{t("account.password")}</label>
        <input
          id="access-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={1}
          maxLength={PASSWORD_MAX_LENGTH}
          disabled={busy}
          autoFocus
        />
        </>}
        {registration && (
          <>
            <label htmlFor="access-workspace-name">
              {t("register.workspaceName")}
              {requiredMarker}
            </label>
            <input
              id="access-workspace-name"
              name="workspaceName"
              type="text"
              autoComplete="off"
              required
              maxLength={100}
              disabled={busy}
            />
            <label htmlFor="access-country">{t("register.country")}</label>
            <select
              id="access-country"
              name="country"
              autoComplete="country"
              value={country}
              onChange={(event) => setCountry(event.target.value as CountryCode | "")}
              disabled={busy}
            >
              <option value="">{t("register.chooseCountry")}</option>
              {countries.map(({ code, name }) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            <label htmlFor="access-phone">{t("register.phone")}</label>
            <PhoneField country={country} countries={countries} disabled={busy} />
          </>
        )}
        <button type="submit" disabled={busy}>
          {t(busy ? "account.pending" : `${step}.submit`)}
        </button>
      </form>
      <button
        type="button"
        className={styles.textButton}
        disabled={busy}
        onClick={() =>
          run(async (signal) => {
            await accountRequest("access", "DELETE", undefined, signal);
            onChangeEmail();
          })
        }
      >
        {t("code.changeEmail")}
      </button>
      <p className={styles.status} role="status" aria-live="polite">
        {error}
      </p>
    </>
  );
}
