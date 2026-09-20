import type { Metadata } from "next";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { GuillocheBackdrop } from "@/components/landing/guilloche-backdrop";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { Link } from "@/i18n/navigation";

import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "Omnibudget | Control financiero claro y abierto",
  description:
    "Revise, importe y mantenga su presupuesto actualizado sin perder el control de sus datos.",
};

export default function Home() {
  const t = useTranslations("Landing");

  return (
    <>
      <LandingHeader />
      <main id="top" className={styles.page}>
        <section className={styles.hero} aria-labelledby="landing-title">
          <GuillocheBackdrop />
          <div className={styles.heroContent}>
            <h1 id="landing-title" className={styles.heroTitle}>
              <Image
                id="landing-hero-logo"
                src="/omnibudget.svg"
                alt="Omnibudget"
                width={300}
                height={67}
                className={styles.heroLogo}
                preload
              />
            </h1>

            <p className={styles.tagline}>{t("hero.tagline")}</p>

            <div className={styles.heroConversion}>
              <p className={styles.heroQuestion}>{t("hero.question")}</p>
              <div className={styles.heroButtons}>
                <a className={`${styles.button} ${styles.secondaryButton}`} href="#about">
                  <Image src="/arrow-down.svg" alt="" width={10} height={6} />
                  <span>{t("hero.learnMore")}</span>
                </a>
                <Link className={`${styles.button} ${styles.primaryButton}`} href="/login">
                  {t("hero.enter")}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className={styles.story} aria-label={t("storyLabel")}>
          <p className={styles.interlude}>{t("interlude")}</p>

          <div className={styles.editorialRows}>
            <article id="features" className={styles.editorialRow}>
              <div className={styles.editorialCopy}>
                <h2>
                  <span>{t("sections.open.headingOne")}</span>
                  <span>{t("sections.open.headingTwo")}</span>
                </h2>
                <div className={styles.bodyCopy}>
                  <p>{t("sections.open.bodyOne")}</p>
                  <p>{t("sections.open.bodyTwo")}</p>
                  <p>{t("sections.open.bodyThree")}</p>
                  <p className={styles.emphasis}>{t("sections.open.emphasis")}</p>
                </div>
              </div>
              <div className={styles.visualSlot} aria-hidden="true" />
            </article>

            <article
              id="principles"
              className={`${styles.editorialRow} ${styles.editorialRowReverse}`}
            >
              <div className={styles.visualSlot} aria-hidden="true" />
              <div className={`${styles.editorialCopy} ${styles.wideCopy}`}>
                <h2>
                  <span>{t("sections.habits.headingOne")}</span>
                  <span>{t("sections.habits.headingTwo")}</span>
                </h2>
                <div className={styles.bodyCopy}>
                  <p>
                    {t.rich("sections.habits.bodyOne", {
                      sludge: (chunks) => <span className={styles.sludge}>{chunks}</span>,
                    })}
                  </p>
                  <p>{t("sections.habits.bodyTwo")}</p>
                  <p className={styles.emphasis}>{t("sections.habits.emphasis")}</p>
                </div>
              </div>
            </article>

            <article className={styles.editorialRow}>
              <div className={`${styles.editorialCopy} ${styles.mediumCopy}`}>
                <h2>
                  <span>{t("sections.control.headingOne")}</span>
                  <span>{t("sections.control.headingTwo")}</span>
                </h2>
                <div className={styles.bodyCopy}>
                  <p>{t("sections.control.bodyOne")}</p>
                  <p>{t("sections.control.bodyTwo")}</p>
                  <p className={styles.emphasis}>{t("sections.control.emphasis")}</p>
                </div>
              </div>
              <div className={styles.visualSlot} aria-hidden="true" />
            </article>
          </div>
        </section>

        <div className={styles.closingPattern}>
          <GuillocheBackdrop placement="closing" />
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
