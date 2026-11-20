# Explore the Fort Yellowstone Historic District (U.S. National Park Service)

## Overview

**Product:** Explore the Fort Yellowstone Historic District (U.S. National Park Service)
**URL:** https://www.nps.gov/thingstodo/yell-tour-fort-yellowstone.htm
**Surface type:** dashboard
**Audience:** Business users and internal teams
**Brand character:** Data-driven application interface with a rich, diverse color palette and single-typeface typography.

> **Note:** Surface detection confidence is low. Verify the inferred audience and brand context before relying on this file.

### Design Principles

- Data visibility — the most important metric should be visible without interaction.
- Progressive disclosure — surface summaries, reveal detail on demand.
- Efficiency over decoration — every pixel should communicate state or enable action.

## Colors

| Token | Value | Role |
|-------|-------|------|
| color-7 | `#F0F0F0` | Background |
| color-1 | `#1B1B1B` | Text Primary |
| color-5 | `#446443` | Text Primary |
| color-6 | `#757575` | Text Secondary |
| color-4 | `#005EA2` | Accent |
| color-3 | `#454545` | Border |
| color-2 | `#154C21` | Background Dark |
| color-8 | `#FFFFFF` | Text Light |

## Typography

**Font stack:** InterVariable

| Level | Size | Usage |
|-------|------|-------|
| text-xs | 11px | Captions, metadata |
| text-sm | 12px | Labels, secondary text |
| text-base | 14px | Body text (default) |
| text-lg | 16px | Subheadings, emphasis |
| text-xl | 20px | Section headings |
| text-2xl | 41px | Section headings |

**Weight scale:** 400 · 700
**Line heights:** 49.728px · 14.976px · 25.6px · 32px · 16.48px · 19.2px · 16.5px · 17.6px · 22.4px · 21.504px · 19.968px · 18px · 44px · 26.368px · 18.4px

## Spacing

**Base unit:** 4px

`space-1: 4px` · `space-2: 5px` · `space-3: 8px` · `space-4: 10px` · `space-5: 12px` · `space-6: 13px` · `space-7: 16px` · `space-8: 18px` · `space-9: 20px` · `space-10: 24px` · `space-11: 26px` · `space-12: 32px` · `space-13: 48px` · `space-14: 128px` · `space-15: 698px`

## Shapes

**Border radius:** `radius-sm: 4px`

## Elevation

_None detected._

## Motion

- **duration-fast:** `all`
- **duration-fast:** `none`

## Components

- **Buttons:** 23 detected
- **Links:** 46 detected
- **Inputs:** 16 detected
- **Navigation:** 4 elements
- **Lists:** 7 detected
- **Forms:** 7 detected
- **Images:** 34 detected

## Do's and Don'ts

### Do

- Reference tokens by name, not raw values — agents and developers should use `color.text.primary`, not `#171717`.
- Define all interactive states: default, hover, focus-visible, active, disabled.
- Use the spacing scale for all padding, margin, and gap values.
- Write content in sentence case. Reserve ALL CAPS for acronyms only.
- Test every component at the smallest and largest breakpoint before shipping.

### Don't

- Do not introduce colors outside the extracted palette.
- Do not use arbitrary spacing values — stick to the scale.
- Do not mix border-radius values. Pin to the detected set (4px).
- Do not use decorative shadows on data-dense layouts.
- Do not hide critical status information behind interactions.
- Do not ship components without defining hover, focus-visible, and disabled states.

## Writing Tone

Efficient, data-forward, action-oriented. Labels over sentences.

## Authoring Workflow

When creating or updating a component guideline for this system, follow this sequence:

1. **State the intent** — one sentence on what the component does and why it exists.
2. **Map tokens** — list every color, spacing, typography, and radius token the component uses. No raw values.
3. **Define anatomy** — break the component into named parts (container, label, icon, etc.) with their token assignments.
4. **Specify states** — document every state: default, hover, focus-visible, active, disabled, loading, error, empty.
5. **Describe interactions** — keyboard, pointer, and touch behavior, including edge cases (long content, overflow, truncation).
6. **Add accessibility criteria** — write testable pass/fail checks (e.g. "focus ring must be visible at 3:1 contrast").
7. **List anti-patterns** — concrete examples of misuse with a brief explanation of why each is wrong.
8. **Close with a QA checklist** — a mechanical list of verifiable items (see Definition of Done below).

## Required Output Structure

Every component guideline produced from this system must contain these sections, in order:

1. Overview — purpose, when to use, when not to use.
2. Tokens and foundations — all referenced tokens from the tables above.
3. Anatomy and variants — named parts, variant matrix, responsive behavior.
4. States and interactions — full state table, keyboard/pointer/touch behavior.
5. Accessibility — ARIA attributes, contrast requirements, focus management, screen reader behavior.
6. Content guidelines — copy length, tone, capitalisation, placeholder text rules.
7. Anti-patterns — explicit examples of what not to build, with reasoning.

## Component Requirements

Every component built against this system must:

- Reference only tokens defined in the tables above — no hardcoded hex, px, or font values.
- Define all interactive states: default, hover, focus-visible, active, disabled, loading, error.
- Specify responsive behavior at the smallest and largest supported breakpoint.
- Handle edge cases: empty state, overflow / truncation, maximum content length.
- Include keyboard navigation (Tab, Enter, Escape, Arrow keys where applicable).
- Document ARIA roles, labels, and live-region behavior where relevant.
- Include known page component density: - **Buttons:** 23 detected
- **Links:** 46 detected
- **Inputs:** 16 detected
- **Navigation:** 4 elements
- **Lists:** 7 detected
- **Forms:** 7 detected
- **Images:** 34 detected

## Definition of Done

A component is not complete until every item below is checked:

- Renders correctly in its default state (smoke test).
- All states documented and visually verified (hover, focus, disabled, loading, error, empty).
- All visual values use design tokens — zero hardcoded values.
- Keyboard navigation works without a pointer.
- No critical accessibility violations (contrast, ARIA, focus order).
- Tested at smallest and largest breakpoint.
- Anti-patterns section lists at least one concrete misuse example.
- Documentation covers purpose, usage, props/API, and limitations.
