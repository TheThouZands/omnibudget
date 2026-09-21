import { accountController } from "@/modules/auth/controllers/account-controller";

export const runtime = "nodejs";
export const GET = accountController().status;
export const DELETE = accountController().reset;
