import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { GuillocheBackdrop } from "@/components/landing/guilloche-backdrop";

import { AccessFlow } from "./access-flow";
import styles from "./access-page.module.scss";

export function AccessPage() {
  const t = useTranslations("Auth");

  return (
    <>
      <header className={styles.header}>
        <Link href="/" aria-label={t("backHomeLabel")}>
          <Image src="/omnibudget.svg" alt="Omnibudget" width={300} height={67} priority />
        </Link>
        <Link className={styles.backLink} href="/">
          {t("backHome")}
        </Link>
      </header>

      <main className={styles.page}>
        <GuillocheBackdrop />
        <div className={styles.content}>
          <AccessFlow />
        </div>
      </main>
    </>
  );
}
