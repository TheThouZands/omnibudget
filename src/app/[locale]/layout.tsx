import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import {Instrument_Sans, Instrument_Serif} from "next/font/google";
import "../globals.scss";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  variable: "--font-instrument-serif",
  subsets: ["latin"],
});

const instrumentSans = Instrument_Sans({
  weight: "variable",
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Omnibudget - A platform for convenient budgeting and finance",
  description: "next saas",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
      <html lang={locale} className={`${instrumentSans.variable} ${instrumentSerif.variable}`}>
        <body>
          <NextIntlClientProvider>
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
  );
}