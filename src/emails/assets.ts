import images from "./assets.generated.json";

export const emailImageIds = {
  logo: "logo@omnibudget.invalid",
  guilloche: "guilloche@omnibudget.invalid",
} as const;

export type InlineEmailImage = {
  filename: string;
  cid: string;
  content: string;
  encoding: "base64";
  contentType: "image/png";
  contentDisposition: "inline";
};

export function createEmailImages(): InlineEmailImage[] {
  return (Object.keys(emailImageIds) as Array<keyof typeof emailImageIds>).map((name) => ({
    filename: `omnibudget-${name}.png`,
    cid: emailImageIds[name],
    content: images[name].base64,
    encoding: "base64",
    contentType: "image/png",
    contentDisposition: "inline",
  }));
}
