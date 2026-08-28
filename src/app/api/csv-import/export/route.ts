import { exportCsvRequest } from "@/modules/csv-import/controllers/csv-controller";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return exportCsvRequest(request);
}
