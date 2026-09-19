import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import styles from "./landing-footer.module.scss";

const navigationItems = [
  { key: "features", href: "#features" },
  { key: "pricing", href: "#principles" },
  { key: "about", href: "#about" },
] as const;

export function LandingFooter() {
  const t = useTranslations("Landing.footer");
  const navigation = useTranslations("Landing.navigation");

  return (
    <footer className={styles.footer}>
      <div className={styles.rail}>
        <div className={styles.identity}>
          <a href="#top" aria-label={navigation("homeLabel")}>
            <Image src="/omnibudget.svg" alt="Omnibudget" width={186} height={41} />
          </a>
          <p>{t("description")}</p>
        </div>

        <nav className={styles.navigation} aria-label={t("navigationLabel")}>
          {navigationItems.map((item) => (
            <a key={item.key} href={item.href}>
              {navigation(item.key)}
            </a>
          ))}
          <a href="https://github.com/TheThouZands/omnibudget" target="_blank" rel="noreferrer">
            {navigation("github")}
          </a>
        </nav>

        <div className={styles.action}>
          <p>{t("actionPrompt")}</p>
          <Link href="/csv-import">{navigation("enter")}</Link>
        </div>
      </div>

      <div className={styles.lowerRail}>
        <span>{t("principle")}</span>
        <span>{t("openSource")}</span>
      </div>
    </footer>
  );
}
