# Dashboard Visual QA Checklist

## Scope

Visual regression and interaction validation for `/today` after dashboard restructure phase 1.

Modes to validate:
- `comfortable`
- `compact`

## Breakpoints

- 360x800 (mobile)
- 768x1024 (tablet)
- 1024x768 (small desktop)
- 1280x800 (desktop)
- 1536x960 (large desktop)

## Global Checks (Both Density Modes)

- Hero zone appears first and keeps clear hierarchy.
- Action zone shows dominant card + support cards without overlap.
- Daily operations grid is readable and does not overflow horizontally.
- Insights zone cards maintain alignment and spacing.
- Extension zone expands/collapses without layout jumps.
- No clipped text in headings, chips, or CTA labels.
- No card collision when widgets are toggled.

## Density-Specific Checks

### Comfortable
- Section spacing remains relaxed (`gap-3` profile).
- Cards preserve breathing room and full content readability.
- Action card remains dominant in `xl` layout.

### Compact
- Section spacing is reduced (`gap-2` profile).
- Cards are denser but still readable and tappable.
- No loss of critical content due to reduced paddings.

## Interaction Checks

- Toggle `Widgets y densidad` popover opens and closes correctly.
- Switching `Compacto` and `Comodo` updates layout immediately.
- Density selection persists after page reload.
- Primary CTA shows hover/focus feedback.
- Reduced-motion users keep functional transitions without aggressive movement.

## Accessibility Checks

- Keyboard can reach and activate density controls.
- Focus state is visible on action controls and cards.
- Status information does not rely only on color.
- Section reading order remains logical in all breakpoints.

## Pass Criteria

- No critical visual regressions in any breakpoint.
- No functional regressions on density switch.
- No accessibility blocker in keyboard and focus flows.
