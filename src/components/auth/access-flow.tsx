"use client";

import { type FormEvent, useId, useState } from "react";
import { useTranslations } from "next-intl";

import styles from "./access-flow.module.scss";

type AccessStep = "email" | "code";

export function AccessFlow() {
  const t = useTranslations("Auth");
  const headingId = useId();
  const [step, setStep] = useState<AccessStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submittedEmail = new FormData(event.currentTarget).get("email");

    if (typeof submittedEmail !== "string") {
      return;
    }

    setEmail(submittedEmail.trim());
    setCode("");
    setStatusMessage("");
    setStep("code");
  }

  function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(t("code.serverRequired"));
  }

  function returnToEmail() {
    setCode("");
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
              required
              autoFocus
            />
            <button type="submit">{t("email.submit")}</button>
          </form>
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
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setStatusMessage("");
              }}
              required
              autoFocus
            />
            <button type="submit">{t("code.submit")}</button>
          </form>

          <button className={styles.textButton} type="button" onClick={returnToEmail}>
            {t("code.changeEmail")}
          </button>

          <p className={styles.status} aria-live="polite">
            {statusMessage}
          </p>
        </>
      )}
    </section>
  );
}
