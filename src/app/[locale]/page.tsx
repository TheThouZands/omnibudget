import Image from "next/image";
import { useTranslations } from "next-intl";

import { GuillocheBackdrop } from "@/components/landing/guilloche-backdrop";
import { LandingHeader } from "@/components/landing/landing-header";
import { Link } from "@/i18n/navigation";

import styles from "./page.module.scss";

export default function Home() {
  const t = useTranslations("CsvImport");

  return (
    <>
      <LandingHeader />
      <main className={styles.page}>
        <GuillocheBackdrop />
        <div className={styles.content}>
          <Image
            src="/omnibudget.svg"
            alt="Omnibudget"
            width={647}
            height={145}
            className={styles.hero}
          />
          <p>
            <Link href="/csv-import">{t("title")}</Link>
          </p>
        </div>
      </main>
    </>
  );
}
