# Omnibudget Figma landing-page QA

## Source visual truth

- Figma file: `Omnibudget Concept` (`A0JAB7cGFoRohTXf4tYxKb`).
- Desktop landing node: `8:2`.
- Mobile landing node: `9:3`.
- Desktop navigation node: `15:8`.
- Mobile navigation node: `19:53`.
- Desktop source export: `design-qa/figma-landing-desktop.png` — 1440 × 5262 px.
- Mobile source export: `design-qa/figma-landing-mobile.png` — 390 × 3904 px.
- Navigation source exports: `design-qa/figma-navigation-desktop.png` and `design-qa/figma-navigation-mobile.png`.

The landing implementation follows the content-bearing inner frames from the WIP concept: 3339 px on desktop and 2798 px on mobile. The unused blank tail of each outer Figma frame is not treated as product content.

## Implementation evidence

- Local route: `http://127.0.0.1:3100/es`.
- Desktop baseline capture: `design-qa/landing-figma-implementation-desktop-full.png` — 1425 × 3365 px.
- Mobile baseline capture: `design-qa/landing-figma-implementation-mobile-full.png` — 375 × 3535 px.
- Desktop hero capture: `design-qa/landing-figma-implementation-desktop-hero.png`.
- Desktop editorial capture: `design-qa/landing-figma-implementation-desktop-editorial.png`.
- Mobile hero capture: `design-qa/landing-figma-implementation-mobile-hero.png`.
- Mobile editorial capture: `design-qa/landing-figma-implementation-mobile-editorial.png`.
- Latest annotation-pass captures were inspected directly in the Codex in-app browser at 1440 × 900 and 390 × 844 CSS viewports. The current full-page rendered sizes are 1425 × 3654 px on desktop and 375 × 4104 px on mobile.

## Viewport and normalization

| Target | CSS viewport | Captured pixels | Source normalization |
| --- | --- | --- | --- |
| Desktop | 1440 × 900 | 1425 × 891 | The in-app browser excludes its 15 px scrollbar and 9 px browser inset. The source was resampled to the implementation content width at density 1. |
| Mobile | 390 × 844 | 375 × 812 | The in-app browser excludes its 15 px scrollbar and 32 px browser inset. The source was resampled to the implementation content width at density 1. |

The 69 px application navigation was removed from hero and editorial crops because the Figma landing frames do not include it. Navigation was compared separately against its dedicated Figma nodes.

## Full-view comparison evidence

- `design-qa/comparison-desktop-full.png`: Figma desktop inner frame on the left; complete implementation on the right.
- `design-qa/comparison-mobile-full.png`: Figma mobile inner frame on the left; complete responsive implementation on the right.

The desktop composition retains the certificate-like hero, editorial alternation, wide negative space, and closing guilloché field. The mobile implementation is longer than the WIP Figma frame because it reflows the desktop-width copy instead of clipping it outside the 390 px viewport.

## Focused comparison evidence

- `design-qa/comparison-desktop-navigation.png`
- `design-qa/comparison-mobile-navigation.png`
- `design-qa/comparison-desktop-hero.png`
- `design-qa/comparison-mobile-hero.png`
- `design-qa/comparison-desktop-editorial.png`
- `design-qa/comparison-mobile-editorial.png`

These crops were required because the navigation labels, hero controls, serif display type, body copy, and mobile wrapping are too small to judge reliably in the full-page images.

## Required fidelity surfaces

### Fonts and typography

- Instrument Serif and Instrument Sans match the Figma families.
- The logo uses the supplied vector artwork rather than recreated text.
- Display headings retain the source weight, tight line height, and alternating alignment.
- Spanish copy is an intentional localization for the only configured locale, `es`.
- Mobile copy wraps inside the viewport instead of reproducing the source frame's accidental overflow.

### Spacing and layout rhythm

- The navigation height is 69 px at both target widths.
- Desktop content keeps the 150 px editorial margins, 120 px section rhythm, and 295 px reserved illustration columns.
- Mobile content uses the Figma 12 px edge spacing and preserves the 120 px editorial rhythm.
- Anchor targets use a 100 px scroll margin so the sticky navigation does not cover headings.
- The footer follows the same desktop content rails and collapses to bordered single-column groups below 480 px.
- No horizontal overflow exists at either verified viewport.

### Colors and visual tokens

- Paper: `#f0e9e2`.
- Ink: `#0a2010`.
- Border: `#ccc3ba`.
- Accent: `#613403`.
- The animated guilloché is rendered at 28% opacity, matching the Figma background treatment.
- A 96 px alpha mask fades the hero pattern into the paper. The closing pattern uses the same fade at both edges.

### Image quality and asset fidelity

- The Omnibudget logo, guilloché, disclosure arrow, and mobile menu icon are original supplied or Figma-exported assets.
- All logo instances declare the SVG's native 300 × 67 aspect ratio and scale without distortion.
- No visible source asset was redrawn with CSS, text glyphs, or a handcrafted replacement.
- Figma's `Graphic here` labels denote unfinished asset slots. The implementation preserves the desktop space but does not expose placeholder text or invent illustrations.

### Copy and content

- The Figma message hierarchy was translated into direct Spanish for the configured locale.
- The primary CTA uses the existing working CSV module at `/es/csv-import`.
- The navigation labels, value proposition, calls to action, and three editorial arguments remain present.

## Interaction and accessibility checks

- The desktop navigation links scroll to real sections.
- The mobile navigation opens, closes, reports `aria-expanded`, and retains a 44 px minimum target size.
- The compact header logo is hidden and removed from keyboard navigation while the hero logo is visible. It becomes visible after the hero logo leaves the viewport.
- The primary CTA and both entry buttons resolve to `/es/csv-import`.
- The secondary hero CTA resolves to `#about`.
- Decorative guilloché images are hidden from the accessibility tree.
- Reduced-motion rules stop the SVG animations and remove smooth scrolling.
- The fresh verification tab reports no browser warnings or errors.

## Comparison history

### Pass 1

- [P2] The first desktop editorial heading wrapped to three lines after Spanish localization, while the source hierarchy uses two lines.
- Fix: reduced only that heading's desktop maximum from 64 px to 56 px and kept the 36 px mobile size.
- Post-fix evidence: `design-qa/comparison-desktop-editorial.png` shows the intended two-line heading.

### Pass 2

- No actionable P0, P1, or P2 differences remain.
- The responsive mobile reflow, localized copy, omitted WIP placeholder labels, and shorter unused tail are intentional adaptations rather than design drift.

### Pass 3 — browser annotation refinements

- [P2] The hero and lower guilloché fields ended on hard horizontal seams instead of fading into the paper as shown in the source.
- Fix: added 96 px alpha masks to the hero lower edge and both closing-field edges without changing the supplied SVG or its animation.
- [P2] The compact header wordmark duplicated the large hero wordmark at the top of the page.
- Fix: observed the hero logo with `IntersectionObserver`; the compact wordmark now remains visually and interactively hidden until the hero logo leaves the viewport.
- [P3] The page had no concluding footer concept.
- Fix: added a restrained footer that reuses the existing wordmark, typography, paper and ink tokens, navigation, CTA, and content rails.
- [P3] The new footer exposed a runtime warning because earlier logo declarations did not use the SVG's exact intrinsic ratio.
- Fix: normalized the hero, header, and footer logo dimensions to 300 × 67 and preserved responsive sizing with automatic height.
- Post-fix evidence: live desktop and mobile full-page captures show soft pattern seams, correct header state, a responsive footer, and no horizontal overflow. A fresh verification tab reports no warnings or errors.

## Open questions

- The Figma file does not contain a login screen. A dedicated authentication route is therefore not inferred in this pass.
- The three reserved graphic slots need source artwork or a selected concept before they should be populated.

## Verification

- ESLint: passed.
- TypeScript: passed.
- Vitest: 262 tests passed across 7 files.
- Next.js production build: passed.
- Browser console: passed with no warnings or errors in a fresh post-fix tab.

final result: passed
