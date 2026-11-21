---
name: Academic Verity
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#404942'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#707971'
  outline-variant: '#bfc9c0'
  surface-tint: '#226b47'
  primary: '#004328'
  on-primary: '#ffffff'
  primary-container: '#0d5c3a'
  on-primary-container: '#8ad2a7'
  inverse-primary: '#8ed6aa'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#5a2e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#7c4100'
  on-tertiary-container: '#ffb273'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a9f3c5'
  primary-fixed-dim: '#8ed6aa'
  on-primary-fixed: '#002111'
  on-primary-fixed-variant: '#005232'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  headline-xl:
    fontFamily: Be Vietnam Pro
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an atmosphere of rigorous scholarly scrutiny, journalistic integrity, and institutional authority. Designed for media researchers, fact-checking desks, and academic councils, the interface balances dense evidentiary data with immediate clarity.

The visual direction draws from **Corporate / Modern** precision combined with **Editorial Clarity**. The layout avoids decorative distractions, prioritizing crisp containment, legible hierarchy, and structured forensic layouts. Surfaces are predominantly light and clinical, anchored by deep emerald accents that represent verification, certified truth, and academic prestige. Tactile trust is reinforced through clean borders, subtle semantic badge tints, and deliberate typographic rhythm.

## Colors

The palette is engineered for institutional credibility, semantic validation, and high-readability research sessions.

- **Primary (`#0D5C3A`)**: Deep academic emerald green. Used for certified headers, primary system actions, verified verdict badges, and brand identity marks.
- **Secondary (`#10B981`)**: Active mint/emerald tint foundation. Used in pale variant backgrounds (`#E6F4EA`) for soft success pills, positive fact-check indicators, and active selection outlines.
- **Tertiary (`#D97706`)**: Warm amber warning. Emphasizes claims requiring context, unverifiable statements, or active forensic alerts without inducing panic. Paired with soft amber surfaces (`#FEF3C7`).
- **Neutral (`#111827`)**: Slate dark text over pristine canvas surfaces (`#FFFFFF` to `#F9FAFB`). Structural card outlines and dividers use neutral gray dividers (`#E5E7EB`).

## Typography

The typography uses **Be Vietnam Pro** across all touchpoints, ensuring native handling of complex multilingual and Vietnamese diacritics while projecting clean, geometric precision. 

- **Article & Research Titles (`headline-xl`, `headline-lg`)**: Bold, disciplined weight, tight tracking to command authority without decorative distraction.
- **Evidence Comparison & Corpus (`body-lg`, `body-md`)**: Calibrated line heights (1.5–1.6 ratio) to ensure sustained comfort when reading side-by-side statement citations and corroborating documents.
- **Meta Badges & Statuses (`label-md`, `label-sm`)**: Uppercase or semi-bold micro-labels with slight tracking for verification standards (e.g., IFCN standard metrics, claim IDs, and reviewer consensus).

## Layout & Spacing

The system applies a structured 12-column grid designed for split-screen forensic evaluation:
- **Left Column / Sidebar (4 columns desktop)**: Extracted claim queue, statement index, metadata tags, and individual credibility confidence scores.
- **Main Analysis Workspace (8 columns desktop)**: Side-by-side claim confrontation panels, consensus verdicts, and primary proof archives.

On desktop views, horizontal section margins are `margin-desktop` (2.5rem) with internal column gutters set to `gutter-desktop` (1.5rem). On mobile and tablet views, the layout collapses into a stacked single-column document review with `margin` (1rem). Compact vertical rhythms (`space-sm` to `space-md`) prevent sparse spacing and keep dense analytical cross-references within immediate eye scan distance.

## Elevation & Depth

Visual hierarchy relies on **low-contrast outlines** and **tonal layer stacking** rather than dramatic drop shadows:
- **Canvas Base**: Pure `#FFFFFF` and cool neutral gray `#F8FAFC`.
- **Card Surfaces**: Crisp `#FFFFFF` surfaces defined by a 1px solid `#E5E7EB` border.
- **Active / Elevated Cards**: Enhanced by a soft 1px border shift to primary or secondary emerald tints accompanied by a subtle ambient shadow (`0 2px 8px -2px rgba(13, 92, 58, 0.08)`).
- **Sticky Toolbars & Review Banners**: Grounded with a clean 1px bottom border stroke without heavy drop shadows to preserve institutional paper-like authenticity.

## Shapes

The design uses a controlled roundedness level (`2`). Standard interactive elements, fact-check argument cards, and form inputs employ an 8px (`0.5rem`) radius.

Smaller verification pills, status badges, and user chips feature fully rounded or pill boundaries (`9999px`) to visually differentiate metadata tags from structural content cards and input fields.

## Components

### Buttons
- **Primary Action**: Deep emerald (`#0D5C3A`) background with pure white typography, 8px border radius, and inset micro-padding for a solid academic press appearance. Hover transitions to `#09442B`.
- **Secondary / Action Ghost**: White surface with a 1px `#E5E7EB` border, slate dark text (`#1F2937`), and subtle hover fills (`#F3F4F6`).
- **Export & Utility Buttons**: Soft emerald or neutral tint surfaces with inline SVG icons for instant document printing or PDF generation.

### Claim & Fact-Check Cards
- **Structural Container**: White container with 1px `#E5E7EB` border, 8px radius, and `space-md` internal padding.
- **Header Slot**: Left-aligned thematic indicator (e.g., green dot for verified, amber dot for pending proof) paired with a claim identifier badge (`#TM-8B5B502C`).
- **Active State**: Selected cards display a 2px left border accent in `#0D5C3A` and a soft mint wash (`#F0FDF4`).

### Badges & Status Chips
- **Verified / Corroborated**: Mint background (`#E6F4EA`) with forest green label (`#0D5C3A`), pill radius, and 11px semi-bold lettering.
- **Pending Evidence / Under Review**: Warm amber background (`#FEF3C7`) with dark amber label (`#B45309`).
- **Institutional Metric Pills**: Flat background (`#F3F4F6`), subtle border (`#E5E7EB`), displaying standard accreditation markers (e.g., IFCN Standard v2.4, Peer Score 0.80 / 1.0).

### Input Fields & Search Bars
- Search inputs incorporate a persistent magnifying icon, quiet placeholder gray (`#9CA3AF`), and a 1px neutral border (`#D1D5DB`). Focus states transition to a 1px border in `#0D5C3A` accompanied by an emerald tint focus ring (`0 0 0 3px rgba(13, 92, 58, 0.12)`).

### Comparison Panels
- Two-column evidentiary confrontation modules: The left panel contains verbatim extracted claims with quotation marks, while the right panel displays verified cross-reference excerpts from accredited wire agencies or peer-reviewed journals, linked via external reference pills.