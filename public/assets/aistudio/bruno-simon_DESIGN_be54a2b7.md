# Three.js Journey

## Overview

**Product:** Three.js Journey
**URL:** https://bruno-simon.com/?utm_source=chatgpt.com
**Surface type:** dashboard
**Audience:** Business users and internal teams
**Brand character:** Data-driven application interface with a balanced color system and 3 typefaces.

> **Note:** Surface detection confidence is low. Verify the inferred audience and brand context before relying on this file.

### Design Principles

- Data visibility — the most important metric should be visible without interaction.
- Progressive disclosure — surface summaries, reveal detail on demand.
- Efficiency over decoration — every pixel should communicate state or enable action.

## Colors

| Token | Value | Role |
|-------|-------|------|
| color-3 | `#FFFFFF` | Background |
| color-1 | `#000000` | Text Primary |
| color-2 | `#D5FF95` | Text Light |

## Typography

**Font stack:** Nunito, Amatic SC, Pally-Medium

| Level | Size | Usage |
|-------|------|-------|
| text-xs | 16px | Captions, metadata |
| text-sm | 20px | Labels, secondary text |
| text-base | 34px | Body text (default) |

**Weight scale:** 400 · 500 · 700
**Line heights:** 34px

## Spacing

**Base unit:** 4px

`space-1: 12px` · `space-2: 15px` · `space-3: 20px`

## Shapes

**Border radius:** _None detected._

## Elevation

_None detected._

## Motion

- **duration-fast:** `all`
- **duration-fast:** `none`
- **duration-fast:** `transform 0.15s 0.15s`
- **duration-slow:** `transform 0.6s cubic-bezier(0.4, 1.6, 0.65, 1)`

## Components

- **Buttons:** 41 detected
- **Links:** 19 detected
- **Inputs:** 5 detected
- **Lists:** 1 detected
- **Tables:** 5 detected
- **Forms:** 2 detected
- **Images:** 51 detected

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
- Include known page component density: - **Buttons:** 41 detected
- **Links:** 19 detected
- **Inputs:** 5 detected
- **Lists:** 1 detected
- **Tables:** 5 detected
- **Forms:** 2 detected
- **Images:** 51 detected

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
