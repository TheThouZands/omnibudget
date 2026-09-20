import type { Metadata } from "next";

import { AccessPage } from "@/components/auth/access-page";

export const metadata: Metadata = {
  title: "Acceso | Omnibudget",
  description: "Continúe en Omnibudget con su correo electrónico.",
};

export default function LoginPage() {
  return <AccessPage />;
}
