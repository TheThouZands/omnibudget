import { passwordStrength } from "./password-strength";

export type StrengthRequest = { id: number; password: string; email: string };
export type StrengthReply = { id: number; score: number | null };

globalThis.onmessage = (event: MessageEvent<StrengthRequest>) => {
  const { id, password, email } = event.data;
  try {
    globalThis.postMessage({
      id,
      score: passwordStrength(password, email),
    } satisfies StrengthReply);
  } catch {
    globalThis.postMessage({ id, score: null } satisfies StrengthReply);
  }
};
