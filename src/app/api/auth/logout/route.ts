import { accountController } from "@/modules/auth/controllers/account-controller";

export const runtime = "nodejs";
export const POST = accountController().logout;
