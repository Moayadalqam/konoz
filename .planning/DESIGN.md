# Design System: Kunoz

## Brand Identity

**Kunoz** — "كنوز" means "Treasures" in Arabic. The brand should feel: **solid, trustworthy, industrial, modern.**

## Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Deep Teal | `#0D7377` | Headers, primary buttons, active states |
| Primary Dark | Dark Teal | `#094B4E` | Hover states, secondary text |
| Accent | Amber | `#F59E0B` | Warnings, late indicators, CTAs |
| Success | Emerald | `#059669` | Present/on-time indicators, confirmations |
| Danger | Red | `#DC2626` | Absent, errors, critical alerts |
| Neutral 50 | Off-white | `#F8FAFC` | Backgrounds |
| Neutral 100 | Light gray | `#F1F5F9` | Card backgrounds |
| Neutral 800 | Dark slate | `#1E293B` | Primary text |
| Neutral 500 | Mid gray | `#64748B` | Secondary text |

## Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Display/Logo | **Plus Jakarta Sans** | 700 | 2rem+ |
| Headings | **Plus Jakarta Sans** | 600 | 1.25–1.75rem |
| Body | **Inter** | 400 | 0.875–1rem |
| Mono/Data | **JetBrains Mono** | 400 | 0.8rem |

## Attendance Status Colors

| Status | Color | Icon |
|--------|-------|------|
| Present (on time) | Emerald `#059669` | ✓ check circle |
| Late | Amber `#F59E0B` | ⏰ clock |
| Absent | Red `#DC2626` | ✗ x circle |
| On Leave | Blue `#3B82F6` | 📋 clipboard |
| Overtime | Purple `#7C3AED` | ⏱ timer |
| Offline sync pending | Gray `#94A3B8` | ↻ sync icon |

## Layout Principles

- **Full-width layouts** — no hardcoded max-width caps. Fluid with sensible padding.
- **Mobile-first** — check-in UI designed for one-handed phone use.
- **Dashboard density** — HR views use data-dense layouts with clear hierarchy.
- **Map-integrated** — site views always show location context.

## Component Patterns

- **Cards**: Subtle border (`border-slate-200`), no heavy shadows. Hover: slight lift + border color change.
- **Buttons**: Rounded (`rounded-lg`), clear hierarchy (primary/secondary/ghost).
- **Tables**: Striped rows for data tables, sticky headers on scroll.
- **Status badges**: Pill-shaped with status color + icon.
- **Check-in button**: Large, centered, prominent — the hero of the mobile view.

## Animations

- Page transitions: `fade-in` 200ms
- Card hover: `transform: translateY(-2px)` 150ms
- Status changes: Color transition 300ms
- Loading states: Skeleton shimmer
- Check-in success: Pulse + scale animation
- Sync indicator: Rotating sync icon

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, large touch targets, bottom nav |
| Tablet | 640–1024px | Two column where appropriate, side nav |
| Desktop | > 1024px | Full dashboard layout, sidebar + main content |

## No-Go List

- No generic card grids
- No blue-purple gradients
- No hardcoded 1200px/1280px max-width
- No Inter as the only font (use Plus Jakarta Sans for headings)
- No generic hero sections

---
*Design system defined: 2026-03-31*
