import type { Metadata } from "next";

import { AccessPage } from "@/components/auth/access-page";

export const metadata: Metadata = {
  title: "Crear acceso | Omnibudget",
  description: "Verifique su correo para crear un acceso a Omnibudget.",
};

export default function RegisterPage() {
  return <AccessPage mode="register" />;
}
