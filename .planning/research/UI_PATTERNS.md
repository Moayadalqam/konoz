# UI/UX Design Patterns for Workforce Attendance Management

**Project:** Kunoz -- Construction Company HR/Attendance System
**Researched:** 2026-03-31
**Overall Confidence:** HIGH (verified across multiple industry sources, official docs, and established design systems)

---

## Table of Contents

1. [Dashboard Design Patterns](#1-dashboard-design-patterns)
2. [Mobile-First Check-In UX](#2-mobile-first-check-in-ux)
3. [Report Visualization](#3-report-visualization)
4. [Construction/Factory Industry UI Conventions](#4-constructionfactory-industry-ui-conventions)
5. [Design System Recommendations](#5-design-system-recommendations)
6. [Arabic RTL & Bilingual Considerations](#6-arabic-rtl--bilingual-considerations)
7. [Offline-First Architecture](#7-offline-first-architecture)
8. [Implementation Recommendations](#8-implementation-recommendations)
9. [Sources](#9-sources)

---

## 1. Dashboard Design Patterns

### 1.1 HR Manager Overview Dashboard

The top-level dashboard must answer one question instantly: "What is the workforce status right now?"

**Layout Pattern: Full-Width Metric Strip + Split Panels**

Avoid generic card grids. Instead, use a full-width horizontal metric strip across the top (Qualia brand standard), followed by a split-panel layout below:

```
+------------------------------------------------------------------+
| [Present: 847]  [Absent: 23]  [Late: 14]  [On Leave: 31]        |  <-- Metric Strip
+------------------------------------------------------------------+
|                              |                                   |
|  Attendance Trend (7-day)    |   Today's Alerts                  |
|  [Area Chart]                |   - 3 sites understaffed          |
|                              |   - 5 workers no-show             |
|                              |   - Overtime threshold: Site C    |
+------------------------------------------------------------------+
|                              |                                   |
|  Site Attendance Breakdown   |   Absenteeism by Department       |
|  [Horizontal Bar Chart]     |   [Donut Chart]                   |
|                              |                                   |
+------------------------------------------------------------------+
```

**Core KPIs for the Metric Strip:**
- Total Present / Total Workforce (as percentage + absolute)
- Absent count (with delta from yesterday)
- Late arrivals (with trend arrow)
- Active overtime hours
- Sites at full capacity vs. understaffed

**Design Principles:**
- Use sharp accent colors for alerts (not pastel). Red for critical, amber for warning.
- Metric strip should use large typography (32-48px numbers) with subtle background gradients per Qualia brand standards.
- Staggered fade-in animations on initial load (CSS transitions requirement).
- Each metric in the strip is clickable, drilling into a filtered detail view.

### 1.2 Site-Level Attendance View

This view is for project managers monitoring a specific construction site.

**Layout Pattern: Site Header + Timeline + Worker List**

```
+------------------------------------------------------------------+
|  [Site Name: Al-Rashid Tower]    [GPS Pin]   [Live: 142 workers] |
+------------------------------------------------------------------+
|  Shift Timeline (6AM -------- 2PM -------- 10PM)                 |
|  |====MORNING====|    |====AFTERNOON====|    |===NIGHT===|       |
|  [142 present]        [Expected: 98]         [Expected: 45]     |
+------------------------------------------------------------------+
|  Worker Status List (searchable, filterable)                     |
|  [Green dot] Ahmad K.   Checked in 06:02   Shift: Morning       |
|  [Red dot]   Faisal M.  No show            Shift: Morning       |
|  [Amber dot] Omar R.    Late - 06:34       Shift: Morning       |
+------------------------------------------------------------------+
```

**Key Features:**
- Live headcount badge updating via real-time subscription (Supabase Realtime)
- Shift timeline as a horizontal bar showing current time marker
- Worker list with status dots (green/red/amber), sortable by status
- Quick-action buttons: "Call worker", "Mark excused", "Reassign"

### 1.3 Employee-Level Detail View

Individual worker attendance history over time.

**Layout Pattern: Profile Header + Calendar Heatmap + Statistics**

```
+------------------------------------------------------------------+
|  [Photo] Ahmad K. Al-Rashidi                                     |
|  Role: Electrician | Site: Al-Rashid Tower | Since: 2024-03     |
+------------------------------------------------------------------+
|  Attendance Calendar Heatmap (GitHub-contribution style)         |
|  [Jan ||||||||||||| Feb ||||||||||||| Mar |||||||||||||]         |
|  Green = present, Red = absent, Amber = late, Gray = weekend    |
+------------------------------------------------------------------+
|  Monthly Stats          |  Patterns & Alerts                     |
|  Present: 22/23 days    |  Monday absence rate: 18% (above avg)  |
|  On-time: 95%           |  Average clock-in: 05:58 AM            |
|  Overtime: 12 hrs       |  No disciplinary issues                |
+------------------------------------------------------------------+
```

### 1.4 Real-Time Attendance Status Board

For display on large screens at site offices or HR headquarters.

**Layout Pattern: TV Dashboard / Information Radiator**

- Auto-rotating between sites every 15-30 seconds
- Large numbers, minimal text, maximum contrast
- Color-coded site cards: green border = fully staffed, amber = attention needed, red = critical understaffing
- Clock display with current shift indicator
- No interactivity needed -- pure display mode
- Use CSS animations for smooth transitions between sites

---

## 2. Mobile-First Check-In UX

### 2.1 One-Tap Clock In/Out

**The single most critical UX in the entire application.** If workers struggle with this, the system fails.

**Pattern: Big Button, Immediate Feedback**

```
+---------------------+
|  Kunoz              |
|  [Site: Al-Rashid]  |
|                     |
|     (( GREEN ))     |
|     ((  BIG  ))     |
|     (( CLOCK ))     |
|     ((  IN   ))     |
|                     |
|  06:02 AM           |
|  Location: Verified |
+---------------------+
```

After clock-in, the button transforms:

```
+---------------------+
|  Kunoz              |
|  [Site: Al-Rashid]  |
|                     |
|     (( RED   ))     |
|     (( CLOCK ))     |
|     ((  OUT  ))     |
|                     |
|  Working: 4h 23m    |
|  [Take Break]       |
+---------------------+
```

**Critical Design Rules:**
1. **One-tap action.** No confirmation dialogs for clock-in. The action must be instant.
2. **State is obvious.** Green = not clocked in (tap to start). Red = clocked in (tap to end). Colors match RAG convention.
3. **Live timer.** Once clocked in, show a live ticking timer. This provides immediate visual confirmation that the system registered the action.
4. **Minimum touch target: 64x64px.** Workers may have gloves or calloused hands. The main button should be at least 120x120px.
5. **High contrast for sunlight.** Dark text on light backgrounds OR use high-saturation colors. Avoid subtle grays.
6. **No scrolling required.** The clock-in action must be visible without scrolling on any phone.

### 2.2 GPS Confirmation UI

**Pattern: Location Verification Before Action**

```
+---------------------+
|  Checking location  |
|  [Pulsing dot on    |
|   mini map]         |
|                     |
|  You are at:        |
|  Al-Rashid Tower    |
|  [Green checkmark]  |
|                     |
|  (( CLOCK IN ))     |
+---------------------+
```

**GPS States and Visual Feedback:**

| State | Visual | Action |
|-------|--------|--------|
| Locating... | Pulsing blue dot + spinner | Wait |
| Inside geofence | Green checkmark + site name | Enable clock-in button |
| Outside geofence | Red X + "Not at site" message | Disable button, show distance |
| GPS unavailable | Yellow warning + "Enable location" | Link to device settings |
| Low accuracy | Amber warning + "Improve GPS" | Suggest moving outdoors |

**Design Rules:**
- Never block the user entirely. If GPS is slow, show a "Clock in anyway (manual review)" option after 10 seconds.
- Show a small map snippet with the geofence circle and the user's position dot. This builds trust -- workers see WHY the system knows their location.
- Privacy notice: "Location is checked only at clock-in/out, not tracked continuously."
- Geofence radius should be generous (100-200m) to account for GPS drift on construction sites.

### 2.3 Offline Mode Visual Indicators

**Pattern: Persistent Status Bar + Per-Action Sync Badges**

```
+---------------------+
| [OFFLINE - Saved    |  <-- Amber banner, persistent
|  locally. Will sync |
|  when online.]      |
+---------------------+
|                     |
|  (( CLOCK IN ))     |
|                     |
|  [Queued icon]      |
|  Clock-in saved     |
|  Will sync when     |
|  connected          |
+---------------------+
```

**Three-State Sync Indicator:**
1. **Online** (green dot or no indicator) -- Normal operation
2. **Offline** (amber bar at top) -- "Saved locally. Will sync when online."
3. **Syncing** (spinning icon) -- "Syncing 3 records..."
4. **Sync failed** (red badge) -- "Tap to retry"

**Language must be simple:** "Saved -- will sync when online." Not "Queued for background synchronization."

**Technical Architecture:**
- Use Serwist (`@serwist/next`) for service worker and offline support in Next.js
- IndexedDB for offline data storage (structured objects, large capacity, async)
- Background Sync API to replay queued actions when connectivity returns
- Idempotent writes on the server to prevent duplicates during retries

### 2.4 Supervisor Bulk Check-In

**Pattern: Select-All Multi-Select List with Two-Section Layout**

```
+---------------------------+
|  Crew Clock-In            |
|  Site: Al-Rashid Tower    |
+---------------------------+
|  OFF THE CLOCK (12)       |
|  [x] Select All           |
|  [x] Ahmad K.             |
|  [x] Omar R.              |
|  [x] Faisal M.            |
|  [ ] Hassan T. (on leave) |
|  ...                      |
+---------------------------+
|  [Clock In Selected (11)] |
+---------------------------+
|                           |
|  ON THE CLOCK (45)        |
|  Ahmad K.    Since 06:02  |
|  Omar R.     Since 06:05  |
|  ...                      |
+---------------------------+
```

**Flow:**
1. Supervisor opens "Crew Clock-In"
2. Sees two sections: "Off the Clock" and "On the Clock"
3. Taps "Select All" or individual checkboxes
4. Taps "Clock In Selected"
5. GPS verification runs once for the supervisor's device (covers all workers)
6. Confirmation: "11 workers clocked in at Al-Rashid Tower"

**Design Rules:**
- The "Select All" checkbox must be prominent -- supervisors clock in entire crews 90% of the time.
- "On the Clock" section shows live time since clock-in for each worker.
- Alphabetical sorting by default, with "On Leave" workers grayed out and non-selectable.
- Undo option: "Undo clock-in" available for 30 seconds after bulk action.
- Quick-search field at the top for large crews (50+ workers).

---

## 3. Report Visualization

### 3.1 Attendance Heatmap (by Day/Site)

**Use a GitHub-style calendar heatmap** to show attendance density across time.

**Axes:**
- X-axis: Days of the month or weeks of the year
- Y-axis: Sites or departments

**Color Scale:**
- Deep green = 95%+ attendance
- Light green = 80-95% attendance
- Amber = 60-80% attendance
- Red = below 60% attendance
- Gray = no data / holiday / weekend

**Library Recommendation:** `@uiw/react-heat-map` or `react-calendar-heatmap`

These are lightweight SVG-based components that render GitHub-contribution-style grids. They are far better suited than Recharts for this specific visualization. Recharts does not have a native calendar heatmap -- do not try to hack one together with ScatterChart.

**Implementation:**
```typescript
// @uiw/react-heat-map for calendar view
// Customize color scale to match Kunoz brand palette
const colorScale = {
  0: '#f0f0f0',   // no data
  1: '#c6efce',   // >95% attendance
  2: '#ffeb9c',   // 80-95%
  3: '#ffc7ce',   // <80%
};
```

### 3.2 Overtime Charts

**Use a stacked bar chart (Recharts)** showing:
- Regular hours (base color)
- Overtime hours (accent color -- use a sharp, saturated tone per Qualia brand)
- Grouped by week or pay period

**Secondary view:** Line chart showing overtime trends over months, with a threshold line marking the company/legal overtime cap.

**Alert integration:** If any worker/site crosses an overtime threshold, the chart segment pulses or shows a warning icon.

### 3.3 Absence Patterns

**Dual visualization approach:**

1. **Day-of-Week Distribution (Bar Chart):** Shows which days have the highest absence rates. Construction typically sees Monday and post-holiday spikes.

2. **Employee Absence Timeline (Dot Plot / Strip Chart):** For individual workers, show each absence as a dot on a timeline. Clusters of dots reveal patterns (e.g., every other Friday, the week before payday).

**Pattern Detection Callouts:**
- "Ahmad K. has been absent 4 Mondays in the last 6 weeks"
- "Site C absenteeism increases 40% during summer months"
- These should appear as card-style alerts above the charts, not buried in data tables.

### 3.4 Export to Excel UI

**Pattern: Carbon Design System Export Pattern**

```
+---------------------------+
|  Export Report             |
|                           |
|  Report: Monthly          |
|          Attendance       |
|                           |
|  Format: [XLSX v]         |
|                           |
|  File name:               |
|  [attendance_mar_2026]    |
|                           |
|  Include:                 |
|  [x] Summary statistics   |
|  [x] Individual records   |
|  [ ] Raw clock-in data    |
|                           |
|  [Cancel]    [Export]     |
+---------------------------+
```

**After clicking Export:**
- Button changes to "Exporting..." with a spinner
- On completion: browser download triggers automatically
- Toast notification: "Report exported successfully"

**Technical approach:** Use SheetJS (`xlsx` package) on the client side for small-to-medium reports. For large datasets (10k+ rows), generate the file server-side via a Next.js Server Action or API route, return a download URL.

**Important:** The xlsx library is 400KB+ minified. Lazy-load it only when the user clicks "Export" -- never include it in the main bundle.

```typescript
// Lazy load SheetJS only when needed
const handleExport = async () => {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  XLSX.writeFile(workbook, `attendance_${month}_${year}.xlsx`);
};
```

---

## 4. Construction/Factory Industry UI Conventions

### 4.1 Color Coding: The RAG System

The construction industry universally uses the Red-Amber-Green (RAG) system. This is non-negotiable for a construction workforce tool.

| Status | Color | Hex Suggestion | Meaning |
|--------|-------|----------------|---------|
| Present | Green | `#16a34a` (green-600) | Worker is on-site and clocked in |
| Absent | Red | `#dc2626` (red-600) | Worker did not show up |
| Late | Amber | `#d97706` (amber-600) | Worker arrived after shift start |
| On Leave | Blue | `#2563eb` (blue-600) | Approved leave |
| On Break | Gray | `#6b7280` (gray-500) | Temporary break |
| Overtime | Purple | `#9333ea` (purple-600) | Working beyond scheduled shift |

**Color accessibility:** All status colors must meet WCAG 2.1 AA contrast ratio (4.5:1 for text). Always pair color with an icon or text label -- never rely on color alone.

### 4.2 Shift Timeline Views

**Horizontal timeline bar** showing shifts across a 24-hour period:

```
6AM        12PM        6PM        12AM       6AM
|--MORNING--|---AFTERNOON--|---NIGHT------|
   [142/150]    [98/120]      [45/50]
```

**Design elements:**
- Current time shown as a vertical red line that advances in real-time
- Each shift block shows current headcount vs. expected
- Color fill: green if >90% staffed, amber if 70-90%, red if <70%
- Tap on a shift block to see the worker list for that shift
- Smooth CSS transition when workers clock in/out (the count animates)

**Library options for shift timelines:**
- **SVAR React Gantt** (MIT, open-source) -- supports hour/minute precision, React 19 compatible
- **Planby** (one-time PRO license) -- timeline-first, virtualizes 10k+ events, TypeScript
- **Custom build** with CSS Grid or Flexbox for simpler shift views -- often sufficient for the 3-shift construction model

**Recommendation:** Build a custom shift timeline component using CSS Grid. Construction sites typically have 2-3 fixed shifts, not complex variable scheduling. A Gantt library is overkill. Save the Gantt for project scheduling if that feature comes later.

### 4.3 Site Map with Live Headcount

**Use React Leaflet with marker clusters showing headcount badges per site.**

```
+------------------------------------------------------------------+
|                    [Map View]                                     |
|                                                                  |
|    [142]                         [87]                            |
|    Al-Rashid Tower               Marina Project                  |
|                                                                  |
|              [203]                                               |
|              Highway Extension                                   |
|                                                                  |
+------------------------------------------------------------------+
```

**Implementation Stack:**
- `react-leaflet` v5.x for the map component
- `react-leaflet-cluster` for marker clustering with headcount badges
- OpenStreetMap tiles (free, no API key) or Mapbox for satellite imagery (useful for construction sites)
- Custom `iconCreateFunction` to render headcount badges with RAG color coding

**Badge Design:**
- Circle with headcount number
- Green border: site at capacity
- Amber border: needs attention
- Red border: critically understaffed
- Tap to zoom into site detail view

**Technical note:** Import Leaflet CSS and cluster CSS files. For Next.js, dynamically import the map component with `ssr: false` since Leaflet requires the `window` object.

```typescript
const SiteMap = dynamic(() => import('@/components/site-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
```

### 4.4 Low-Literacy-Friendly Interface (Worker App)

**This is the most important UX challenge in the project.** Construction workers in Jordan range from tech-savvy to barely literate. The worker-facing app must accommodate the full spectrum.

**Design Principles:**

1. **Icons over text.** Every action should have a large, clear icon. The clock-in button should have a clock icon + the word, not just the word.

2. **Skeuomorphic cues.** Make the clock-in button look like a physical button (shadow, depth, 3D feel). Workers understand physical objects better than flat UI abstractions.

3. **Minimal screens.** The worker app should have exactly 3 screens:
   - Clock In/Out (home screen)
   - My History (simple list of recent check-ins)
   - My Profile (name, site, shift)

4. **Large touch targets.** Minimum 48x48px per WCAG, but aim for 64x64px or larger. Workers may have dirty screens, wet fingers, or gloves.

5. **Limited text, clear hierarchy.** Use 20px+ font for primary information. Avoid paragraphs. Use single words or short phrases.

6. **Visual confirmations.** After clock-in: a large green checkmark animation (not just a toast notification). After clock-out: a summary card showing hours worked.

7. **No nested navigation.** No hamburger menus, no dropdowns, no tab bars with 5+ items. Bottom nav with 3 big icons maximum.

8. **Bilingual by default.** Arabic and English simultaneously where possible (Arabic label above, English below), or a one-tap language toggle that is always visible.

---

## 5. Design System Recommendations

### 5.1 shadcn/ui Components for Kunoz

shadcn/ui is the right choice. It uses Recharts v3 for charts, ships as local TypeScript files (no dependency lock-in), and is fully WAI-ARIA compliant via Radix UI primitives.

**Core Components Needed:**

| Component | Purpose in Kunoz |
|-----------|-----------------|
| `Card` | Metric panels in dashboard, worker profile cards |
| `DataTable` | Employee lists, attendance records, report tables |
| `Chart` (Recharts) | Area charts (trends), bar charts (overtime), donut charts (distribution) |
| `Tabs` | Switching between daily/weekly/monthly views |
| `Sheet` | Slide-over panels for worker detail, quick actions |
| `Select` | Site filter, department filter, shift filter |
| `DatePicker` | Date range selection for reports |
| `Skeleton` | Loading states for all data-dependent components |
| `Sidebar` | Main navigation for HR dashboard |
| `Badge` | Status indicators (Present, Absent, Late) with RAG colors |
| `Avatar` | Worker profile photos in lists |
| `Toast` | Success/error notifications for actions |
| `Dialog` | Export configuration, confirmation dialogs |
| `Command` | Quick search across workers, sites |
| `Switch` | Toggle settings (notifications, auto-clock-out) |

**Installation:**
```bash
npx shadcn-ui@latest add card data-table chart tabs sheet select skeleton sidebar badge avatar toast dialog command switch
```

### 5.2 Chart Libraries

**Primary: Recharts v3 (via shadcn/ui chart component)**

Use for:
- Area charts: 7-day and 30-day attendance trends
- Bar charts: Overtime hours by worker/site/department
- Stacked bar charts: Shift breakdown (regular + overtime)
- Donut/pie charts: Absence reasons, department distribution
- Line charts: Long-term trends with threshold lines

**Secondary: @uiw/react-heat-map**

Use for:
- Calendar heatmap (GitHub-contribution style) for individual worker attendance
- Site-level attendance density across days of month

**Do NOT use:**
- Chart.js -- redundant with Recharts, different API paradigm, no shadcn/ui integration
- D3.js directly -- too low-level for dashboard charts, Recharts already wraps D3
- MUI X Charts -- different design system, would conflict with shadcn/ui theming

### 5.3 Map Integration

**React Leaflet v5 + OpenStreetMap tiles**

- Free, no API key required
- Sufficient for showing site locations with headcount markers
- Use `react-leaflet-cluster` for grouping nearby sites

**When to upgrade to Mapbox:**
- If satellite imagery is needed (useful for viewing actual construction site layouts)
- If custom map styling is needed for brand consistency
- Mapbox has a free tier (50k map loads/month) -- sufficient for internal HR tools

### 5.4 Responsive Layout Patterns

**Three breakpoint strategy:**

| Breakpoint | Device | Layout |
|------------|--------|--------|
| < 640px (sm) | Phone (worker app) | Single column, bottom nav, large buttons |
| 640-1024px (md-lg) | Tablet (supervisor) | Two-column layout, side panel for details |
| > 1024px (xl) | Desktop (HR manager) | Full dashboard, sidebar nav, multi-panel |

**Worker phone (< 640px):**
- Full-width clock-in button centered on screen
- No sidebar, no complex navigation
- Bottom navigation with 3 icons: Clock, History, Profile

**Supervisor tablet (640-1024px):**
- Crew list on left, detail panel on right
- Top bar with site selector and quick stats
- Swipe gestures for navigating between sites

**HR desktop (> 1024px):**
- Full shadcn/ui Sidebar for navigation
- Dashboard with 2-3 column grid
- Charts and data tables side by side
- Full-width metric strip at top (Qualia brand standard: no 1200px max-width caps)

---

## 6. Arabic RTL & Bilingual Considerations

Jordan operates in Arabic with significant English usage. Kunoz must support both.

### 6.1 Font Selection

**Recommendation: Tajawal for body + UI, Cairo for headings**

Both are free Google Fonts with native Arabic + Latin support.

| Font | Use | Why |
|------|-----|-----|
| **Tajawal** | Body text, UI labels, data tables | Geometric precision, 7 weights, excellent at small sizes, bilingual harmony |
| **Cairo** | Headings, metric numbers, dashboard titles | Bold presence, balanced traditional-modern, strong display weight |

Both meet the Qualia brand standard of "distinctive fonts (not Inter/Arial)."

**Technical implementation:**
```css
/* Use unicode-range to serve different weights optimally */
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=Tajawal:wght@300;400;500;700&display=swap');

:root {
  --font-heading: 'Cairo', sans-serif;
  --font-body: 'Tajawal', sans-serif;
}
```

**Arabic typography rules:**
- Increase line-height to 1.6-1.8x (vs 1.4-1.5x for English)
- Minimum 16px body text for Arabic
- Avoid bold overuse -- Arabic connected letterforms become harder to read when bold
- Numbers always display left-to-right, even in RTL context

### 6.2 Layout Mirroring

Use CSS Logical Properties everywhere to support automatic RTL:

```css
/* DO: Logical properties */
margin-inline-start: 1rem;
padding-inline-end: 0.5rem;
border-inline-start: 2px solid var(--accent);

/* DON'T: Physical properties */
margin-left: 1rem;  /* Breaks in RTL */
```

**What to mirror:**
- Navigation (sidebar moves to right)
- Text alignment (right-aligned)
- Arrow/chevron icons (flip direction)
- Progress indicators

**What NOT to mirror:**
- Numbers and phone numbers
- Brand logos
- Playback controls
- Chart axes (most Arabic speakers read charts left-to-right)
- Clock-in/out button (centered, no directionality)

### 6.3 Bilingual UI Strategy

**Option A (Recommended): User-selected language with one-tap toggle**
- Store language preference in user profile
- Show toggle in header/settings (Arabic flag / English flag)
- Full page re-renders in selected language
- Use `next-intl` or `next-i18next` for i18n
- Set `dir="rtl"` on `<html>` when Arabic is selected

**Option B: Simultaneous bilingual labels**
- Arabic above, English below for critical UI elements (clock-in button, navigation)
- More inclusive but clutters the interface
- Reserve for worker-facing screens only

### 6.4 Cultural Considerations for Jordan

- **Work week:** Sunday-Thursday (Friday-Saturday weekend)
- **Calendar:** Gregorian is standard in Jordan (unlike Saudi Arabia which uses Hijri)
- **Number format:** Arabic-Indic numerals (Eastern Arabic: ٠١٢٣٤٥٦٧٨٩) are understood but Western Arabic numerals (0123456789) are more common in business contexts. Use Western numerals.
- **Date format:** DD/MM/YYYY is standard in Jordan

---

## 7. Offline-First Architecture

### 7.1 Why Offline Matters for Construction

Construction sites often have:
- Poor cellular coverage (remote locations, underground work, steel structures blocking signal)
- Workers arriving at 5-6 AM before site infrastructure is fully powered
- Multiple workers clocking in simultaneously (network congestion)

Offline support is not optional. It is a core requirement.

### 7.2 Technical Stack for Offline

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Service Worker | Serwist (`@serwist/next`) | Cache app shell, handle offline requests |
| Local Storage | IndexedDB (via `idb` library) | Store clock-in/out records, worker data |
| Sync | Background Sync API | Replay queued actions when online |
| Conflict Resolution | Timestamp-based, server wins | Handle duplicate submissions |

### 7.3 Offline UX Flow

```
1. Worker opens app (cached app shell loads instantly)
2. App checks connectivity
   a. ONLINE: Normal flow, GPS check, clock-in, instant sync
   b. OFFLINE:
      - Show amber "Offline" banner
      - Allow clock-in (stored in IndexedDB with timestamp + device GPS)
      - Show "Saved locally" confirmation
      - When connectivity returns:
        - Show "Syncing..." spinner
        - Replay queued actions
        - Show "Synced" confirmation
        - Remove amber banner
```

### 7.4 PWA Manifest

```json
{
  "name": "Kunoz Attendance",
  "short_name": "Kunoz",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#16a34a",
  "icons": [...]
}
```

Workers should be prompted to install the PWA on their home screen for the fastest possible access. A standalone PWA eliminates the browser chrome and feels like a native app.

**Serwist caveat:** Next.js 16 uses Turbopack by default, but Serwist requires Webpack. The build script must use `next build --webpack` until Serwist adds TurboPack support.

---

## 8. Implementation Recommendations

### 8.1 Phased Build Order

Based on the feature complexity and dependencies:

**Phase 1: Worker Clock-In (Mobile)**
- One-tap clock-in/out
- GPS verification
- Basic offline support
- Worker's own attendance history
- *This is the foundation. If workers cannot clock in reliably, nothing else matters.*

**Phase 2: Supervisor Tools (Tablet/Mobile)**
- Bulk crew clock-in
- Site-level worker list
- Shift timeline view
- Real-time headcount

**Phase 3: HR Dashboard (Desktop)**
- Full metric strip + charts
- Site map with headcount markers
- Attendance heatmaps
- Alerts and pattern detection

**Phase 4: Reporting & Analytics**
- Excel export
- Absence pattern analysis
- Overtime tracking and alerts
- Custom report builder

**Phase 5: TV Dashboard / Status Board**
- Auto-rotating site views
- Large-screen optimized layout
- No interaction, pure display

### 8.2 Component Architecture

```
components/
  ui/                          # shadcn/ui base components
  attendance/
    clock-in-button.tsx        # The big green/red button
    gps-status.tsx             # Location verification UI
    offline-indicator.tsx      # Amber banner + sync badges
    shift-timeline.tsx         # Horizontal shift bar
    attendance-heatmap.tsx     # Calendar heatmap wrapper
    status-badge.tsx           # RAG status dot + label
  dashboard/
    metric-strip.tsx           # Full-width KPI bar
    site-card.tsx              # Site summary for map/list
    alert-panel.tsx            # Today's alerts sidebar
    attendance-chart.tsx       # Recharts trend wrapper
  supervisor/
    crew-clock-in.tsx          # Bulk check-in list
    worker-list.tsx            # Filterable worker table
  reports/
    export-dialog.tsx          # Excel export configuration
    absence-pattern.tsx        # Pattern detection display
  map/
    site-map.tsx               # React Leaflet map (dynamic import)
    headcount-marker.tsx       # Custom cluster icon
```

### 8.3 Animation & Interaction Standards (Qualia Brand)

Per Qualia brand requirements:

| Interaction | Animation |
|------------|-----------|
| Page load | Staggered fade-in for dashboard panels (150ms delay between each) |
| Clock-in success | Large green checkmark scale-in animation (300ms ease-out) |
| Clock-out success | Summary card slide-up (200ms ease-in-out) |
| Status change | Color transition (150ms) on status badges |
| Metric update | Number counter animation (400ms) using CSS `@property` |
| Map markers | Bounce-in on initial load (200ms spring) |
| Heatmap | Progressive cell reveal from left to right (50ms stagger) |
| Alerts | Slide-in from right with subtle shake for critical (300ms) |

**Avoid:** Heavy animations on the worker app (battery drain, distraction on slow devices). Reserve elaborate animations for the HR dashboard.

### 8.4 Color Palette Recommendation

Build a cohesive palette with sharp accents (Qualia brand standard):

```css
:root {
  /* Base */
  --background: #fafafa;
  --foreground: #0a0a0a;
  --surface: #ffffff;

  /* Brand - Sharp accent */
  --primary: #0d9488;       /* Teal-600 - distinctive, not generic blue */
  --primary-light: #14b8a6;
  --primary-dark: #0f766e;

  /* RAG Status (sacred - do not change) */
  --status-present: #16a34a;
  --status-absent: #dc2626;
  --status-late: #d97706;
  --status-leave: #2563eb;
  --status-break: #6b7280;
  --status-overtime: #9333ea;

  /* Chart palette */
  --chart-1: #0d9488;
  --chart-2: #6366f1;
  --chart-3: #f59e0b;
  --chart-4: #ec4899;
  --chart-5: #8b5cf6;

  /* Layered backgrounds (Qualia brand) */
  --surface-elevated: #ffffff;
  --surface-muted: #f4f4f5;
  --surface-sunken: #e4e4e7;
}
```

---

## 9. Sources

### Dashboard Design Patterns
- [HRM Dashboard for Efficient Workforce Management (2026)](https://multipurposethemes.com/blog/hrm-dashboard-for-efficient-workforce-management-in-2026-job-portals/)
- [HR Attendance Dashboard | Bold BI](https://www.boldbi.com/dashboard-examples/hr/attendance-dashboard/)
- [HR Dashboard Examples | HiBob](https://www.hibob.com/blog/hr-dashboard-examples/)
- [HR Dashboard: Key Examples | Qlik](https://www.qlik.com/us/dashboard-examples/hr-dashboard)
- [12 Dashboard Layout Patterns | datawirefra.me](https://www.datawirefra.me/blog/dashboard-layout-patterns)

### Mobile Check-In UX
- [Clock In/Out Experience -- UX/UI for Mobile Field Workers | Andres Clavijo](https://www.andresclavijo.com/portfolio-project/clock-in-case-study)
- [Designing the Clock In/Out Feature | Medium](https://medium.com/wearedayone/designing-the-clock-in-out-feature-part-1-569eed448d8b)
- [Best Mobile Time Clock App for Construction | TimeTrex](https://www.timetrex.com/blog/best-mobile-time-clock-app-for-construction)
- [Construction Time Clocks with GPS | EPAY Systems](https://epaysystems.com/constructions-guide-to-mobile-time-tracking/)
- [Biometric Time Tracking for Construction | SmartBarrel](https://smartbarrel.io/)

### Supervisor Bulk Check-In
- [Using Crew Clock | ClockShark](https://help.clockshark.com/using-crewclock-to-punch-your-crew-in-via-mobile)
- [Supervisor Tools | busybusy](https://helpcenter.busybusy.com/en/articles/9573478-use-supervisor-tools-to-make-life-easy)
- [Best Clock-In Apps 2026 | Connecteam](https://connecteam.com/best-clock-in-clock-out-app/)

### Construction Industry UX
- [Why Construction Tech UX Is Different | AlterSquare](https://altersquare.medium.com/why-construction-tech-ux-is-different-designing-for-jobsite-realities-fef93f431721)
- [Designing Apps for the Illiterate | Alex Cox](https://alexcox245.medium.com/designing-apps-for-the-illiterate-and-digitally-challenged-india-edition-5a19d176b49c)
- [Features Every Blue-Collar App Needs | ABLEMKR](https://ablemkr.com/features-blue-collar-app-needs/)
- [BlueCollar App Case Study | Medium](https://medium.com/@anurajkr/blue-collar-app-80b4d56c24b7)
- [Top Construction Apps 2026 | Autodesk](https://www.autodesk.com/blogs/construction/top-construction-apps/)

### Visualization & Heatmaps
- [Data Visualization in Time Attendance Systems | Purllow](https://www.purllow.com/attendance-systems-workforce-roi/)
- [react-calendar-heatmap | npm](https://www.npmjs.com/package/react-calendar-heatmap)
- [@uiw/react-heat-map | GitHub](https://github.com/uiwjs/react-heat-map)
- [React Heatmap Chart | MUI X](https://mui.com/x/react-charts/heatmap/)

### shadcn/ui & Charts
- [shadcn/ui Chart Docs](https://ui.shadcn.com/docs/components/radix/chart)
- [shadcn/ui Charts Gallery](https://ui.shadcn.com/charts/area)
- [Build a Dashboard with shadcn/ui (2026)](https://designrevision.com/blog/shadcn-dashboard-tutorial)
- [Build Admin Dashboard with shadcn/ui and Next.js (2026)](https://adminlte.io/blog/build-admin-dashboard-shadcn-nextjs/)

### Maps & Geolocation
- [React Leaflet Docs](https://react-leaflet.js.org/)
- [react-leaflet-cluster | GitBook](https://akursat.gitbook.io/marker-cluster)
- [Geofencing Best Practices | Leverege](https://www.leverege.com/blogpost/top-3-best-design-practices-in-geofencing)
- [Geofencing App Design Concept | Medium](https://mariusgrigore-ux.medium.com/ux-ui-case-study-mobile-geofencing-app-design-concept-5fb510571093)

### Offline & PWA
- [Build Next.js 16 PWA with Offline Support | LogRocket](https://blog.logrocket.com/nextjs-16-pwa-offline-support/)
- [Next.js PWA Guide | Official Docs](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Building PWA in Next.js with Serwist | Medium](https://javascript.plainenglish.io/building-a-progressive-web-app-pwa-in-next-js-with-serwist-next-pwa-successor-94e05cb418d7)
- [Offline-First PWA Architecture | beefed.ai](https://beefed.ai/en/offline-first-pwa-architecture)

### RTL & Arabic UI
- [Bidirectionality | Material Design](https://m2.material.io/design/usability/bidirectionality.html)
- [Designing Mobile Apps for Arabic Speakers | Milaaj](https://www.milaajbrandset.com/blog/rtl-mobile-app-design-arabic-users/)
- [Right-to-Left UI Design Fundamentals | BlackboardUXD](https://medium.com/blackboard-design/fundamentals-of-right-to-left-ui-design-for-middle-eastern-languages-afa7663f66ed)
- [Arabic RTL Web Design Best Practices | Bycom](https://bycomsolutions.com/blog/arabic-rtl-web-design-best-practices/)
- [Tajawal Font | Google Fonts](https://fonts.google.com/specimen/Tajawal)
- [Cairo Font | Google Fonts](https://fonts.google.com/specimen/Cairo)

### Export & Reports
- [Carbon Design System -- Export Pattern](https://carbondesignsystem.com/community/patterns/export-pattern/)
- [SheetJS + Next.js Docs](https://docs.sheetjs.com/docs/demos/static/nextjs/)
- [SheetJS + React Docs](https://docs.sheetjs.com/docs/demos/frontend/react/)

### Shift Timelines
- [SVAR React Gantt (Open Source)](https://svar.dev/react/gantt/)
- [Planby React Schedule Component](https://planby.app/)
- [Mobiscroll Employee Shifts Example](https://demo.mobiscroll.com/react/timeline/employee-shifts)

### RAG Status Convention
- [RAG Status in Engineering | Waydev](https://waydev.co/rag-status/)
- [Construction Attendance Tracking | VisualRegistration](https://www.visualregistration.com/blog/construction-attendance-tracking-site-workers)
