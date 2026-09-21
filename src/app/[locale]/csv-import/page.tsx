import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentAccountSession } from "@/modules/auth/server/current-session";
import { LogoutButton } from "@/components/auth/logout-button";
import CsvImportClient from "./csv-import-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CsvImport");

  return { title: t("title"), description: t("metaDescription") };
}

export default async function CsvImportPage() {
  if (!await getCurrentAccountSession()) {
    redirect({ href: "/login", locale: await getLocale() });
  }
  const t = await getTranslations("CsvImport");

  return (
    <main>
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>
      <p><Link href="/">{t("backHome")}</Link></p>
      <LogoutButton />
      <CsvImportClient />
    </main>
  );
}
