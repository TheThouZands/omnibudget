import type { OtpCodeSender } from "../models/otp";

export const developmentOtpSender: OtpCodeSender = {
  async send({ code }) {
    return { developmentCode: code };
  },
};
