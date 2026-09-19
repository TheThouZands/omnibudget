"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Link } from "@/i18n/navigation";

import styles from "./landing-header.module.scss";

const navigationItems = [
  { key: "features", href: "#features" },
  { key: "pricing", href: "#principles" },
  { key: "about", href: "#about" },
] as const;

export function LandingHeader() {
  const t = useTranslations("Landing.navigation");
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className={styles.header}>
      <a className={styles.brand} href="#top" aria-label={t("homeLabel")}>
        <Image
          src="/omnibudget.svg"
          alt="Omnibudget"
          width={186}
          height={41}
          priority
        />
      </a>

      <button
        className={styles.menuButton}
        type="button"
        aria-expanded={isOpen}
        aria-controls="landing-navigation"
        aria-label={isOpen ? t("closeMenu") : t("openMenu")}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Image src="/menu.png" alt="" width={28} height={22} />
      </button>

      <nav
        id="landing-navigation"
        className={`${styles.navigation} ${isOpen ? styles.navigationOpen : ""}`}
        aria-label={t("ariaLabel")}
      >
        <div className={styles.navigationLinks}>
          {navigationItems.map((item) => (
            <a key={item.key} href={item.href} onClick={closeMenu}>
              {t(item.key)}
            </a>
          ))}
          <a
            href="https://github.com/TheThouZands/omnibudget"
            target="_blank"
            rel="noreferrer"
            onClick={closeMenu}
          >
            {t("github")}
          </a>
        </div>

        <div className={styles.entryAction}>
          <Link href="/csv-import" onClick={closeMenu}>
            {t("enter")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
