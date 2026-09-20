import type { Metadata } from "next";

import { AccessPage } from "@/components/auth/access-page";

export const metadata: Metadata = {
  title: "Entrar | Omnibudget",
  description: "Solicite un código de acceso de un solo uso para entrar a Omnibudget.",
};

export default function LoginPage() {
  return <AccessPage mode="login" />;
}
