import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import CsvImportClient from "./csv-import-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CsvImport");

  return { title: t("title"), description: t("metaDescription") };
}

export default async function CsvImportPage() {
  const t = await getTranslations("CsvImport");

  return (
    <main>
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>
      <p><Link href="/">{t("backHome")}</Link></p>
      <CsvImportClient />
    </main>
  );
}
