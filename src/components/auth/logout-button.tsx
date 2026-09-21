"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { accountRequest } from "@/modules/auth/client/account-client";

export function LogoutButton({ className }: { className?: string }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function logout() {
    setBusy(true);
    setFailed(false);
    try {
      await accountRequest("logout", "POST");
      // Discard authenticated router state after the server revokes the session.
      window.location.replace(getPathname({ href: "/", locale }));
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }
  return (
    <>
      <button className={className} type="button" onClick={logout} disabled={busy} aria-busy={busy}>
        {t("account.logout")}
      </button>
      {failed && <p role="alert">{t("errors.request_failed")}</p>}
    </>
  );
}
