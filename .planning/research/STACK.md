# Technology Stack

**Project:** Kunoz Workforce Attendance System
**Researched:** 2026-03-31

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 16+ | Full-stack framework | App Router, server actions, API routes. Already in Moayad's stack. |
| React | 19 | UI library | Concurrent features, server components, transitions for optimistic UI |
| TypeScript | 5.x | Type safety | Non-negotiable for attendance data integrity |

### Database & Backend
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase | Latest | Backend-as-a-service | Postgres + Auth + RLS + Realtime. Already in stack. Eliminates custom backend. |
| PostGIS | (Supabase extension) | Geospatial queries | GPS coordinate storage, geofence radius checks (`ST_DWithin`), distance calculations |
| Supabase Realtime | Built-in | Live dashboard updates | Postgres Changes for real-time attendance feed to supervisors |
| Supabase Auth | Built-in | Authentication | Email/password for supervisors, magic link for admins. RLS policies per role. |

### PWA & Offline
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Serwist | 9.x | Service worker toolkit | Next.js-native PWA support, successor to next-pwa, active maintenance |
| idb | 8.x | IndexedDB wrapper | Lightweight (1.2KB), Promise-based API over raw IndexedDB. Better DX than Dexie for simple schemas. |
| Web App Manifest | Standard | PWA installability | Home screen install, splash screen, standalone display mode |
| Background Sync API | Standard | Deferred sync | Queue offline punches, replay on connectivity. Chromium-only; fallback for Safari/Firefox. |

### UI & Design
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | Styling | Utility-first, fast iteration, responsive. Already in stack ecosystem. |
| shadcn/ui | Latest | Component library | Accessible, customizable, copy-paste components. Not a dependency -- you own the code. |
| Recharts | 2.x | Dashboard charts | Lightweight, React-native charting for attendance analytics |
| Lucide React | Latest | Icons | Clean, consistent icon set. Works well with shadcn. |

### Geolocation & Maps
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Geolocation API | Web Standard | GPS coordinates | Browser-native, no library needed. `navigator.geolocation.getCurrentPosition()` |
| Leaflet + react-leaflet | 4.x / 5.x | Map visualization | Free, open-source. Display geofence zones, employee locations on admin map. No API key needed. |

### Validation & Forms
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zod | 3.x | Schema validation | Server + client validation. Required by security rules. |
| React Hook Form | 7.x | Form management | Performant forms for employee CRUD, shift definitions, etc. |

### Date/Time Handling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| date-fns | 3.x | Date manipulation | Tree-shakeable, immutable. Handles timezone-aware overtime calculations. |
| date-fns-tz | 3.x | Timezone support | Saudi Arabia is AST (UTC+3). Must store timestamps in UTC, display in AST. |

### Export & Reporting
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| xlsx (SheetJS) | Latest | Excel export | HR departments expect Excel. Generate .xlsx attendance reports. |
| jsPDF | Latest | PDF export | Formal attendance reports, printable summaries. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Service Worker | Serwist | next-pwa | next-pwa is unmaintained since 2023. Serwist is its actively maintained fork. |
| IndexedDB | idb | Dexie.js | Dexie adds unnecessary abstraction for our simple schema. idb is lighter and closer to the metal. |
| Maps | Leaflet | Google Maps / Mapbox | Leaflet is free with no API keys. Google Maps charges per load. For admin-only map views, Leaflet is sufficient. |
| Charts | Recharts | Chart.js / D3 | Recharts is React-native. Chart.js needs a wrapper. D3 is overkill for attendance dashboards. |
| CSS | Tailwind | CSS Modules | Tailwind is faster for iteration and responsive design. Already in the ecosystem. |
| Date library | date-fns | Day.js / Luxon | date-fns is tree-shakeable (smaller bundle). Day.js lacks strong timezone support. Luxon is heavier. |
| State management | React Context + useReducer | Zustand / Redux | For this scale (~70 employees), React's built-in state is sufficient. No need for external state library. |
| Real-time | Supabase Realtime | Socket.io / Pusher | Already included with Supabase. No additional service needed. |

## Installation

```bash
# Core
npx create-next-app@latest kunoz --typescript --tailwind --app --src-dir

# Database & Auth
npm install @supabase/supabase-js @supabase/ssr

# PWA & Offline
npm install serwist @serwist/next idb

# UI Components (shadcn -- installed via CLI)
npx shadcn@latest init
npx shadcn@latest add button card input label select table tabs dialog sheet badge

# Charts & Visualization
npm install recharts react-leaflet leaflet
npm install -D @types/leaflet

# Forms & Validation
npm install zod react-hook-form @hookform/resolvers

# Date handling
npm install date-fns date-fns-tz

# Export
npm install xlsx jspdf

# Icons
npm install lucide-react
```

## Key Configuration Notes

- **Timezone:** All timestamps stored as UTC in Supabase. Display converted to `Asia/Riyadh` (UTC+3) on client.
- **PostGIS:** Enable via Supabase dashboard (Database > Extensions > PostGIS). Geofence coordinates stored as `geography(Point, 4326)`.
- **RLS:** Every table must have Row Level Security policies. Supervisors see their location's data. Admins see all.
- **Service Worker:** Register in `app/layout.tsx`, Serwist config in `next.config.ts`.

## Sources

- [Next.js 16 PWA with offline support - LogRocket (Jan 2026)](https://blog.logrocket.com/nextjs-16-pwa-offline-support/)
- [Offline-First PWA with Next.js, IndexedDB, Supabase - Medium (Jan 2026)](https://oluwadaprof.medium.com/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9)
- [Supabase PostGIS Docs](https://supabase.com/docs/guides/database/extensions/postgis)
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Offline-first frontend apps 2025 - LogRocket](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
