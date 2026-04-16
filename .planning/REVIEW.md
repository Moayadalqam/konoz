---
date: 2026-04-06 11:00
mode: web
critical_count: 0
high_count: 5
medium_count: 7
low_count: 3
status: has_blockers
---

# Web Production Audit — 2026-04-06

**Project:** Kunoz (Workforce Attendance Management)
**Stack:** Next.js 16 + Supabase + Vercel + PWA

---

## Blockers (HIGH)

- **[S1]** `src/actions/employees.ts:149,178` — `getEmployeesAction` and `getEmployeeAction` missing `requireAuth()` / `requireRole()`. Any unauthenticated user can invoke these to list all employees. **Fix**: Add `await requireRole("admin", "hr_officer", "supervisor")`.

- **[S2]** `src/actions/notifications.ts:40,69` — IDOR: `markNotificationReadAction` and `deleteNotificationAction` missing ownership check. Any authenticated user can suppress other users' notifications. **Fix**: Add `.eq("recipient_id", profile.id)`.

- **[S3]** `src/actions/locations.ts:79` + `src/actions/shifts.ts:82,150` — `getLocationsAction`, `getShiftsAction`, `getShiftAssignmentsAction` missing `requireAuth()`. **Fix**: Add auth check.

- **[S4]** `package.json:30` — `xlsx` v0.18.5 has high-severity prototype pollution (GHSA-4r6h-8v6p-xvw6). No upstream fix. **Fix**: Replace with `exceljs` or generate CSV.

- **[P1]** `src/actions/supervisor.ts:126-129,207-252` — N+1 query in batch clock-in/out. 30 employees = 60 sequential DB queries (~3s). **Fix**: Fetch all shifts in one `.in()` query.

## Recommendations (MEDIUM)

- **[S5]** `src/app/auth/callback/route.ts:7` — Open redirect via unvalidated `next` param. Validate starts with `/` and not `//`.
- **[S6]** `next.config.ts` — No CSP, X-Frame-Options, HSTS headers. Add security headers.
- **[S7]** `src/lib/validations/attendance.ts:84` — No size limit on photo_base64. Add `.max(5_000_000)` and MIME whitelist.
- **[P2]** 12x `select("*")` across actions — replace with explicit columns.
- **[P3]** Unbounded list queries without `.limit()` in employees, locations, shifts.
- **[P4]** No caching on dashboard reads. Add `unstable_cache` with 30-60s TTL.
- **[R1]** Only 2 `error.tsx` at layout level. Add route-specific boundaries for high-traffic routes.

## Informational (LOW)

- **[P5]** Leaflet setup duplicated in 3 map components. Extract to shared utility.
- **[P6]** Raw `<img>` in supervisor-attendance.tsx:597. Replace with `next/image`.
- **[P7]** `resolveEmployeeShift` duplicated in attendance.ts and supervisor.ts.

## Shipping Checklist

| Check | Status |
|-------|--------|
| Secrets not in code | PASS |
| Service role key server-only | PASS |
| No XSS vectors | PASS |
| Server actions auth-gated | FAIL (5 missing) |
| RLS enabled | WARN (no migrations in repo) |
| Input validation (Zod) | PASS |
| Error boundaries | PASS (layout-level) |
| Loading states | PASS (10 routes) |
| 404 page | PASS |
| PWA manifest + SW | PASS |
| Build succeeds | PASS |
| Security headers | FAIL (none) |
| npm audit clean | FAIL (xlsx) |

---

## Previous Review (2026-04-05)

31 findings (3 CRITICAL, 8 HIGH, 12 MEDIUM, 8 LOW). Many addressed in the brand redesign work. Remaining findings consolidated above.

---

**Status: has_blockers** — 5 HIGH findings must be resolved before production handoff.
