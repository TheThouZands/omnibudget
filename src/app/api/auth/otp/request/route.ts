import { issueOtpRequest } from "@/modules/auth/controllers/otp-controller";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return issueOtpRequest(request);
}
