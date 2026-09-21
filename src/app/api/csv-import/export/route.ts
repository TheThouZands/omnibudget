import { exportCsvRequest } from "@/modules/csv-import/controllers/csv-controller";
import { protectAccountRoute } from "@/modules/auth/server/session-guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return protectAccountRoute(request, exportCsvRequest);
}
