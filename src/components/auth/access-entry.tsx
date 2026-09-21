import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { getCurrentAccountSession } from "@/modules/auth/server/current-session";

import { AccessModal } from "./access-modal";
import { AccessPage } from "./access-page";

export async function AccessEntry({ modal = false }: { modal?: boolean }) {
  if (await getCurrentAccountSession()) {
    redirect({ href: "/csv-import", locale: await getLocale() });
  }

  // Do not mount the dialog or email form until an existing session is resolved.
  return modal ? <AccessModal /> : <AccessPage />;
}
