---
name: Academic Veracity
colors:
  surface: '#ebfef7'
  surface-dim: '#ccded8'
  surface-bright: '#ebfef7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e5f8f1'
  surface-container: '#dff2eb'
  surface-container-high: '#daece6'
  surface-container-highest: '#d4e7e0'
  on-surface: '#0e1e1b'
  on-surface-variant: '#3f4946'
  inverse-surface: '#23342f'
  inverse-on-surface: '#e2f5ee'
  outline: '#6f7976'
  outline-variant: '#bfc9c5'
  surface-tint: '#25695c'
  primary: '#004339'
  on-primary: '#ffffff'
  primary-container: '#145c50'
  on-primary-container: '#90d2c2'
  inverse-primary: '#91d3c4'
  secondary: '#51625d'
  on-secondary: '#ffffff'
  secondary-container: '#d4e7e0'
  on-secondary-container: '#576863'
  tertiary: '#685e34'
  on-tertiary: '#ffffff'
  tertiary-container: '#b8ab7a'
  on-tertiary-container: '#483f18'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#adf0df'
  primary-fixed-dim: '#91d3c4'
  on-primary-fixed: '#00201b'
  on-primary-fixed-variant: '#005045'
  secondary-fixed: '#d4e7e0'
  secondary-fixed-dim: '#b8cbc4'
  on-secondary-fixed: '#0e1e1b'
  on-secondary-fixed-variant: '#3a4a46'
  tertiary-fixed: '#f1e2ad'
  tertiary-fixed-dim: '#d4c693'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#50471f'
  background: '#ebfef7'
  on-background: '#0e1e1b'
  surface-variant: '#d4e7e0'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 27.2px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system embodies scholarly rigor, institutional trust, and objective clarity tailored for higher education and journalistic integrity research in Vietnam. Visual expressions steer clear of sensationalism, emphasizing calm authority, transparency, and methodical documentation.

The aesthetic blends **Academic Minimalism** with **Editorial Precision**: generous negative space, measured proportions, crisp structured lines, and understated accents that let verified citations, statistical datasets, and textual analysis remain the focal point.

## Colors
The palette leverages high-legibility neutrals grounded by natural, authoritative greens:

- **Canvas & Background:** `#F6F8F7` provides an organic, low-glare paper-like reading backdrop.
- **Surfaces:** `#FFFFFF` separates structured documents, presentation slides, and evaluation cards cleanly from the canvas.
- **Primary Accent (`#145C50`):** Deep forest green reserved for key branding marks, primary actions, active navigation tabs, and prominent metric indicators.
- **Text & Hierarchy:** Primary body and title text sits at `#182824` for sharp contrast without optical vibration; `#52635E` anchors secondary metadata, timestamps, and author attributions.
- **Borders & Dividers:** Subtle, structural divisions utilize `#E1E8E5`.
- **Textual Evidence Highlight (`#FFF0BA`):** Pale yellow designated solely for inline text highlights denoting verified evidence phrases or key quotations.
- **Verification Verdict Statuses:** Kept strictly to discrete badges and micro-indicators:
  - Verified (`Được xác nhận`): `#15803D`
  - Refuted (`Bị bác bỏ`): `#B91C1C`
  - Inconclusive (`Chưa đủ chứng cứ`): `#B45309`

## Typography
`Inter` is utilized universally across all hierarchy levels to ensure complete, native typographic fidelity for Vietnamese accent marks and complex tone combinations (dấu ngã, dấu hỏi, dấu nặng). 

Primary reading levels (`body-lg`) adhere strictly to a 17px font size with a 1.6 relative line height (27.2px) to maximize legibility during sustained reading of claims, transcript excerpts, and research methodology notes. Display and headline weights apply tight negative letter tracking to maintain visual cohesion in long institutional titles.

## Layout & Spacing
The layout follows a responsive 12-column grid on desktop screens (max-width `1280px` centered) and collapses to a 4-column system on mobile devices. 

- **Desktop (1024px+):** 12 columns with 24px (`1.5rem`) gutters and 48px (`3rem`) page margins.
- **Tablet (768px - 1023px):** 8 columns with 20px gutters and 32px margins.
- **Mobile (<768px):** 4 columns with 16px (`1rem`) gutters and 20px (`1.25rem`) margins.

Vertical rhythm relies on multiples of 8px. Comparative analysis blocks and side-by-side claim validations use uniform `space-lg` gaps to clearly delineate fact from commentary.

## Elevation & Depth
Elevation emphasizes planar discipline and flat tonal layering over intense physical shadows:

- **Level 0 (Canvas):** Flat `#F6F8F7`.
- **Level 1 (Cards, Slide Panels):** Solid `#FFFFFF` surface enclosed by a fine 1px structural border `#E1E8E5`. Subtle shadow applied: `0 1px 3px rgba(24, 40, 36, 0.04), 0 1px 2px rgba(24, 40, 36, 0.02)`.
- **Level 2 (Modals, Citations popovers):** `#FFFFFF` surface accompanied by `0 8px 24px -4px rgba(24, 40, 36, 0.08), 0 2px 6px -1px rgba(24, 40, 36, 0.04)`.

## Shapes
Surfaces, containers, data tables, and input fields utilize consistent 8px (`0.5rem`) border radii to evoke modern precision without softening into playful territory. Status chips and pill badges maintain a fully rounded circular cap (`9999px`) to differentiate functional metadata from layout structures.

## Components

### Buttons
- **Primary:** Filled `#145C50` background, `#FFFFFF` text, 8px radius, medium weight (`label-md`). Hover transitions subtly to `#0E433A`.
- **Secondary / Outline:** 1px border of `#E1E8E5`, background `#FFFFFF`, text `#182824`. Hover brings a faint background shift to `#F6F8F7`.
- **Text Link / Citation Trigger:** No background, `#145C50` weight 500, underlined on hover.

### Verdict Badges & Status Chips
Small, compact tags configured with uppercase `label-sm` typography, a 9999px pill radius, and 4px padding-y by 10px padding-x.
- **Được xác nhận (Verified):** Background `#DCFCE7`, text `#15803D`, border `1px solid rgba(21, 128, 61, 0.2)`.
- **Bị bác bỏ (Refuted):** Background `#FEE2E2`, text `#B91C1C`, border `1px solid rgba(185, 28, 28, 0.2)`.
- **Chưa đủ chứng cứ (Inconclusive):** Background `#FEF3C7`, text `#B45309`, border `1px solid rgba(180, 83, 9, 0.2)`.

### Cards & Verification Units
- White background (`#FFFFFF`), 1px border (`#E1E8E5`), 8px border radius, 24px (`space-lg`) internal padding.
- Used for presenting news claims, methodology breakdowns, statistical sources, and media reliability scorecards.

### Form Inputs & Selectors
- Search inputs for verifying articles feature 1px `#E1E8E5` borders, 8px corner radii, `#182824` body text, and an active focus outline of 2px in `#145C50`.

### Inline Evidence Highlighter
- Mark tags and highlighted textual spans apply background `#FFF0BA` with 2px border radius and 1px padding-x to demarcate decisive statements extracted directly from reviewed publications.