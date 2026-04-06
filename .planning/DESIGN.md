# Design System: Kunoz

## Brand Identity

**Kunoz** — "كنوز" means "Treasures" in Arabic. The brand should feel: **solid, trustworthy, premium, warm.**

## Color Palette

| Role | Color | Hex | CSS Token | Usage |
|------|-------|-----|-----------|-------|
| Primary | Crimson | `#B8163A` | `--primary` | Headers, primary buttons, active states, sidebar accents |
| Primary Dark | Dark Crimson | `#8B1030` | — | Hover states (use `bg-primary/90`) |
| Accent | Gold | `#D4A843` | `--accent` | CTAs, highlights, brand flourishes |
| Success | Emerald | `#059669` | `--success` | Present/on-time indicators, confirmations |
| Warning | Amber | `#E6A817` | `--warning` | Late indicators, caution states |
| Danger | Red | `#DC2626` | `--destructive` | Absent, errors, critical alerts |
| Background | Warm Off-white | oklch(0.985 0.003 30) | `--background` | Page backgrounds |
| Card | White | `#FFFFFF` | `--card` | Card surfaces |
| Text | Dark Slate | oklch(0.17 0.012 30) | `--foreground` | Primary text |
| Muted | Mid Gray | oklch(0.52 0.012 30) | `--muted-foreground` | Secondary text |

**Rule**: Always use CSS tokens (`bg-primary`, `text-foreground`, etc.) — never hardcode hex values in components.

## Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Display/Logo | **Playfair Display** | 700 | 2rem+ |
| Headings | **Playfair Display** | 600 | 1.25-1.75rem |
| Body | **Inter** | 400 | 0.875-1rem |
| Mono/Data | **JetBrains Mono** | 400 | 0.8rem |

Playfair Display gives a premium editorial feel that pairs with the Crimson/Gold palette. Applied via `font-heading` class on all h1-h6.

## Attendance Status Colors

| Status | Color | Token | Icon |
|--------|-------|-------|------|
| Present (on time) | Emerald | `text-success` | CheckCircle2 |
| Late | Amber | `text-warning` | Clock |
| Absent | Red | `text-destructive` | XCircle |
| On Leave | Blue | `text-blue-600` | Clipboard |
| Overtime | Purple | `text-purple-600` | Timer |
| Offline sync pending | Gray | `text-muted-foreground` | RefreshCw |

## Layout Principles

- **Full-width layouts** — no hardcoded max-width caps. Fluid with sensible padding.
- **Mobile-first** — check-in UI designed for one-handed phone use.
- **Dashboard hierarchy** — hero stats (Present/Absent) get visual prominence; secondary stats are smaller.
- **Map-integrated** — site views always show location context.

## Component Patterns

- **Cards**: `ring-1 ring-border` (subtle outline), no heavy shadows. `bg-card` background.
- **Auth cards**: Same as dashboard cards — `bg-card ring-1 ring-border shadow-sm rounded-xl`. No glassmorphism.
- **Buttons**: `rounded-lg`, clear hierarchy (primary/secondary/ghost). Always use the `Button` component or `buttonVariants()`.
- **Tables**: Striped rows for data tables, sticky headers on scroll.
- **Status badges**: Pill-shaped with status color + icon.
- **Check-in button**: Large, centered, prominent — the hero of the mobile view.
- **Empty states**: Icon + contextual message explaining what will appear. No dashed borders.

## Animations

- Page transitions: `fade-in` 200ms
- Status changes: Color transition 300ms
- Loading states: Skeleton shimmer
- Check-in success: Pulse + scale animation
- Sync indicator: Rotating sync icon
- `prefers-reduced-motion` respected globally

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, large touch targets, bottom nav |
| Tablet | 640-1024px | Two column where appropriate, side nav |
| Desktop | > 1024px | Full dashboard layout, sidebar + main content |

## Sidebar

4 grouped sections with uppercase headers:
- **EMPLOYEES**: Employee List, My Attendance, Shifts, HR Actions
- **LOCATIONS**: Location List, Site Attendance, Bulk Check-in
- **REPORTS**: Reports
- **USER MANAGEMENT**: User Management

Dashboard accessible via KUNOZ logo. Notifications via topbar bell.

## No-Go List

- No glassmorphism or backdrop-blur on content cards
- No hardcoded hex colors in components (use CSS tokens)
- No `Button render={<Link>}` (use `Link` + `buttonVariants`)
- No hardcoded 1200px/1280px max-width
- No Inter as the only font (Playfair Display for headings)
- No identical-weight stat card grids (hero stats must be prominent)
- No generic empty states (always contextual message + icon)

---
*Design system defined: 2026-03-31*
*Updated: 2026-04-06 — brand redesign (Crimson/Gold/Playfair), normalized auth pages, stat hierarchy*
