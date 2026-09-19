# Landing guilloché visual QA

## Evidence

- Reference crop: `design-qa/reference-crop.png`
- Wide implementation: `design-qa/landing-guilloche-wide.png`
- Portrait implementation: `design-qa/landing-guilloche-mobile.png`

## Responsive comparison

| Viewport | Visible SVG window | Result |
| --- | --- | --- |
| 1440 × 720 | x 36.0–236.0, y 44.0–144.0 | Matches the wide top crop in the reference. |
| 390 × 844 | x 156.8–236.8, y 44.0–217.1 | Matches the narrow top-right crop in the reference. |

Both crops keep the final four SVG units beyond the right edge of the viewport. This margin prevents the clipped curve ends from becoming part of the composition. Landscape viewports use the wide crop. Portrait and square viewports use the narrow crop.

## Checks

- The two SVG curve groups retain the approved independent loop durations and directions.
- Two browser frames captured 800 ms apart differ, which confirms that the animation runs on the landing page.
- The viewport has no horizontal overflow at the verified sizes.
- The SVG is decorative and is hidden from the accessibility tree.
- The SVG stops both animations when `prefers-reduced-motion: reduce` is active.
- The browser console has no warnings or errors.
- ESLint, TypeScript, the production build, and all 262 automated tests pass.

final result: passed
