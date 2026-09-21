import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Link, redirect } from "@/i18n/navigation";
import { findAccountSession, loadAccountRuntime } from "@/modules/auth/server/account-runtime";
import { LogoutButton } from "@/components/auth/logout-button";
import CsvImportClient from "./csv-import-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CsvImport");

  return { title: t("title"), description: t("metaDescription") };
}

export default async function CsvImportPage() {
  const requestHeaders = await headers();
  const origin = process.env.BETTER_AUTH_URL || `${process.env.NODE_ENV === "production" ? "https" : "http"}://${requestHeaders.get("host") || "localhost:3000"}`;
  const runtime = await loadAccountRuntime(origin);
  if (!await findAccountSession(requestHeaders, runtime)) {
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
