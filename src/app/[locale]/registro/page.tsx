import type { Metadata } from "next";

import { AccessEntry } from "@/components/auth/access-entry";

export const metadata: Metadata = {
  title: "Acceso | Omnibudget",
  description: "Continúe en Omnibudget con su correo electrónico.",
};

export default function RegisterPage() {
  return <AccessEntry />;
}
