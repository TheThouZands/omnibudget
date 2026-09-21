"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { accountRequest } from "@/modules/auth/client/account-client";

export function LogoutButton() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function logout() {
    setBusy(true);
    setFailed(false);
    try {
      await accountRequest("logout", "POST");
      router.replace("/");
      router.refresh();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }
  return (
    <>
      <button type="button" onClick={logout} disabled={busy}>
        {t("account.logout")}
      </button>
      {failed && <p role="alert">{t("errors.request_failed")}</p>}
    </>
  );
}
