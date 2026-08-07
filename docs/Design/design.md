---
name: Admin Logic
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#444651'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#425aa9'
  primary: '#0f2d7b'
  on-primary: '#ffffff'
  primary-container: '#2c4593'
  on-primary-container: '#a5b7ff'
  inverse-primary: '#b6c4ff'
  secondary: '#97378d'
  on-secondary: '#ffffff'
  secondary-container: '#fd8feb'
  on-secondary-container: '#7b1c74'
  tertiary: '#253549'
  on-tertiary: '#ffffff'
  tertiary-container: '#3b4b61'
  on-tertiary-container: '#abbbd4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164f'
  on-primary-fixed-variant: '#28418f'
  secondary-fixed: '#ffd7f3'
  secondary-fixed-dim: '#ffabee'
  on-secondary-fixed: '#390036'
  on-secondary-fixed-variant: '#7b1c73'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Public Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 24px
---

## Brand & Style

This design system is engineered for high-utility corporate environments where data density and clarity are paramount. The brand personality is authoritative yet unobtrusive, prioritizing functional efficiency over decorative flair. It targets administrative professionals, HR managers, and system auditors who require a "cockpit" view of organizational health.

The design style follows a **Corporate / Modern** aesthetic. It utilizes a refined structural grid, subtle tonal layering, and high-precision typography to organize complex information hierarchies. The interface aims to evoke a sense of stability, precision, and institutional trust, ensuring that users can process large volumes of administrative data without cognitive fatigue.

## Colors

The color strategy uses the primary brand blue (#0f2d7b) to anchor the interface in professionalism and trust, while the secondary plum (#97378d) is reserved for highlighting strategic insights and distinct administrative actions.

- **Primary:** Used for main navigation, primary actions, and active states.
- **Secondary:** Used for analytical highlights, specific module accents (e.g., HR or Finance), and secondary CTA buttons.
- **Surface Scale:** A range of cool grays (Slate) provides the foundation for the "Data-Dense" look, using #f7f9fb for backgrounds and #ffffff for content cards.
- **Functional Colors:** Standardized Red (Error), Amber (Warning), and Emerald (Success) are used sparingly to signal system status within list views and KPI cards.

## Typography

The typography system is split between **Public Sans** for structural headers and **Inter** for data-heavy content.

- **Public Sans** provides an institutional, trustworthy feel for module headers and page titles.
- **Inter** is utilized for its exceptional legibility at small sizes.
- **Data Precision:** For tables and KPI cards, "tabular figures" (monospaced numbers) must be enabled via `tnum` to ensure that numerical columns align perfectly for easy visual scanning and comparison.

## Layout & Spacing

This design system employs a **Fluid Grid** with a strict 4px baseline to maximize screen real estate.

- **Grid:** A 12-column system is used for dashboard layouts.
- **Density:** Padding is intentionally compact (8px-12px in list items) to allow for more rows of data per viewport.
- **Modular Layouts:** Page structures should prioritize a "Top-Down" hierarchy: Global KPI cards at the top (spanning 3 columns each), followed by a primary Data Table or List View (spanning 8-12 columns), and optional side-panel modules for Task Management or Audit Logs.

## Elevation & Depth

To maintain a clean and professional appearance, this design system uses **Tonal Layers** supplemented by **Low-Contrast Outlines**.

- **Layering:** The application background is #f7f9fb. Content containers (cards/lists) use #ffffff with a 1px border of #c5c5d3 (outline-variant).
- **Depth:** Physical shadows are used only for transient elements like dropdown menus, tooltips, or modals. These shadows are "Ambient": highly diffused, low opacity (e.g., `0px 4px 12px rgba(0, 0, 0, 0.05)`), and neutral in tint.
- **Interactivity:** Hover states are indicated by a subtle shift in background color (e.g., white to #f2f4f6, surface-container-low) rather than an increase in shadow depth, keeping the interface feeling grounded and stable.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a modern touch without sacrificing the "serious" nature of administrative software.

- **Standard Elements:** Buttons, input fields, and small cards use a 4px (0.25rem) radius.
- **Containers:** Larger modules or dashboard sections use 8px (0.5rem) to provide a clear visual container for grouped data.
- **Status Pills:** Status chips use a full-pill radius (100px) to distinguish them from actionable buttons and interactive fields.

## Components

- **KPI Cards:** Minimalist blocks containing a `label-md` title, a `headline-lg` value (using tabular figures), and a small trend indicator. No decorative icons; focus purely on the metric.
- **List Views:** High-density rows with 1px dividers. Use `body-sm` for secondary metadata and `data-mono` for IDs or numerical values. Column headers should be `label-md` and sticky.
- **Buttons:**
  - *Primary:* Solid #0f2d7b (primary) with white text.
  - *Secondary:* Ghost style with #0f2d7b (primary) border and text.
  - *Tertiary:* Flat #97378d (secondary) for specific administrative "Special" actions.
- **Input Fields:** Outlined style with a 1px #c5c5d3 (outline-variant) border. Focused states use a 2px #0f2d7b (primary) border. Labels are positioned above the field using `label-md`.
- **Administrative Modules:** Side-panels or collapsible "Drawers" are used for editing user permissions or viewing task details, maintaining the context of the main list view.
- **Status Chips:** Small, condensed pills with light background tints (e.g., Light Green bg with Dark Green text) to denote "Active," "Pending," or "Archived" states.
