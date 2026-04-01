# Phase 2: Locations & Employees — UAT Results

## Test Results

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | `npm run dev` / build starts clean | ✅ | `npm run build` passes, all 16 routes generated correctly |
| 2 | 8 locations visible on map at `/dashboard/locations` | ✅ | 8 locations in DB with GPS coords, Leaflet map renders with markers, route registered as dynamic |
| 3 | Location geofence circles render with correct radius | ✅ | `L.circle` uses `geofence_radius_meters` (150-300m), teal color `#0D7377` at 12% opacity |
| 4 | Admin can create a new location via dialog | ✅ | `LocationForm` wired to `createLocationAction`, Zod validation, map picker for coordinates |
| 5 | Admin can edit an existing location | ✅ | Edit callback flows: table/card → `onEdit` → `LocationForm` with pre-filled values |
| 6 | 70 employees listed at `/dashboard/employees` | ✅ | 70 employees in DB (65 active, 5 inactive), all KNZ-001 through KNZ-070 format |
| 7 | Employee filters work (location, department, status, search) | ✅ | URL param-based filters with debounced search, clear button, filter bar component |
| 8 | Admin can create a new employee | ✅ | `EmployeeForm` wired to `createEmployeeAction`, department/position selects, location dropdown |
| 9 | Admin can edit employee and reassign location | ✅ | `updateEmployeeAction` handles location assignment + role sync to `profiles.role` |
| 10 | Employee profile page shows basic info and mini-map | ✅ | Profile page at `/dashboard/employees/[id]` with details grid, mini-map, attendance placeholder |
| 11 | Seed script runs without errors and is idempotent | ✅ | Re-run outputs "Already seeded (8 locations, 70 employees found). Skipping." |
| 12 | RLS policies enforce access (non-admin/HR cannot write) | ✅ | 10 RLS policies verified: 4 on locations, 6 on employees (including SECURITY DEFINER helper) |
| 13 | Responsive layout (mobile/tablet/desktop) | ✅ | Desktop: table view, Mobile: card view. Map 60/40 split on lg, stacked on mobile. Page padding consistent. |
| 14 | `npx tsc --noEmit` passes | ✅ | 0 errors |

## Security Checks

| Check | Status | Notes |
|-------|--------|-------|
| `service_role` key not in client components | ✅ | Only in `lib/supabase/admin.ts` and scripts — never in `"use client"` files |
| Admin client only imported server-side | ✅ | Used in `actions/admin.ts`, `actions/employees.ts` (server actions), server pages only |
| Leaflet dynamic import with `ssr: false` | ✅ | All 3 map components (location-map, location-picker, employee-mini-map) use `dynamic()` with `ssr: false` |
| Zod validation on all form inputs | ✅ | `locationSchema` and `employeeSchema` validated in both client forms and server actions |
| Role checks on all mutations | ✅ | All server actions call `requireRole("admin", "hr_officer")` before mutation |

## Issues Found During Verification

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | Employee profile page missing page-level padding | Minor | Fixed — added `px-4 py-8 sm:px-6 lg:px-8` wrapper |
| 2 | Employees list page missing padding wrapper in server route | Minor | Fixed — added consistent wrapper in page.tsx |

Both issues were fixed during verification.

## Overall: ✅ PASSED

All 14 acceptance criteria pass. 2 minor layout issues found and fixed during verification.

---
*Verified: 2026-03-31*
