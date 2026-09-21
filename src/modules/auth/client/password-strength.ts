import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as common from "@zxcvbn-ts/language-common";
import * as english from "@zxcvbn-ts/language-en";
import * as spanish from "@zxcvbn-ts/language-es-es";

const estimator = new ZxcvbnFactory({
  graphs: common.adjacencyGraphs,
  translations: spanish.translations,
  dictionary: {
    ...common.dictionary,
    ...Object.fromEntries(
      Object.entries(english.dictionary).map(([key, words]) => [
        `en_${key}`,
        words,
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(spanish.dictionary).map(([key, words]) => [
        `es_${key}`,
        words,
      ]),
    ),
  },
});

export function passwordStrength(password: string, email: string) {
  // Never return the password, matched substrings, or personal inputs to the UI.
  return estimator.check(password, [email, email.split("@")[0], "Omnibudget"])
    .score;
}
