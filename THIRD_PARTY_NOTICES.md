# Third-party notices

## Password strength estimation

The browser uses [zxcvbn-ts](https://github.com/zxcvbn-ts/zxcvbn) (MIT), a TypeScript implementation of Dropbox's zxcvbn password-strength estimator. Its bundled common, English, and Spanish dictionaries are provided by the `@zxcvbn-ts/language-*` packages.

The English and Spanish `commonWords` dictionaries are derived from the **OpenSubtitles 2024** dataset distributed through [OPUS](https://opus.nlpl.eu/datasets/OpenSubtitles), licensed under the [Open Data Commons Attribution License (ODC-BY)](https://opendatacommons.org/licenses/by/1-0/). The upstream language packages generate ranked word lists from that dataset. Omnibudget uses those lists without changing their entries.

Password hint positioning uses [Floating UI](https://floating-ui.com/) (MIT). Package license texts remain available in the installed distributions.
