import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./page.module.scss";

export default function Home() {
  const t = useTranslations("CsvImport");
  return (
    <>
      <Image
          src="/omnibudget.svg"
          alt="Omnibudget"
          width={647}
          height={145}
          className={styles.hero}
      />
      <p><Link href="/csv-import">{t("title")}</Link></p>
    </>
  );
}
