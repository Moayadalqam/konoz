---
date: 2026-04-01 14:30
mode: web
critical_count: 5
high_count: 11
medium_count: 16
low_count: 11
status: has_blockers
---

# Review — 2026-04-01 (Deep Parallel-Agent Audit)

Agents: Security, Performance, Architecture, Code Quality (all Opus)

## Blockers (CRITICAL + HIGH)

### CRITICAL — Must fix before deploy

1. **[Security] Open redirect in auth callback** — `src/app/auth/callback/route.ts:7-13`
   The `next` query param is used in `redirect()` without validation. Attacker can craft `?next=https://evil.com` to redirect users post-login.
   Fix: Validate `next` starts with `/` and doesn't contain `://`.

2. **[Security] Hardcoded admin credentials in seed script** — `src/scripts/seed-admin.ts:10-11`
   Fallback `admin@kunoz.sa` / `KunozAdmin2026!` if env vars not set. Anyone reading source code can log in as admin.
   Fix: Remove hardcoded fallbacks, require env vars, error if missing.

3. **[Security] Notification IDOR — missing ownership check** — `src/actions/notifications.ts:40-51,69-80`
   `markNotificationReadAction` and `deleteNotificationAction` don't verify the notification belongs to the calling user. Any authenticated user can mark/delete others' notifications.
   Fix: Add `.eq("recipient_id", profile.id)` to update/delete queries.

4. **[Security] PostgREST filter injection via unescaped search** — `src/actions/employees.ts:167-169`
   `filters.search` interpolated directly into `.or()` string. Special chars (`,`, `.`, `(`) can alter query logic.
   Fix: Use individual `.ilike()` calls or sanitize input.

5. **[Security] Missing middleware.ts — no edge route protection** — `src/proxy.ts` exists but `src/middleware.ts` does not
   The proxy function isn't wired as Next.js middleware. Session refresh and route guards don't execute at the edge.
   Fix: Create `src/middleware.ts` that re-exports: `export { proxy as middleware, config } from "./proxy"`.

### HIGH — Should fix soon

6. **[Security] Missing auth guards on read-only server actions** — `src/actions/locations.ts:79`, `employees.ts:149,178`, `shifts.ts:150`
   `getLocationsAction`, `getEmployeesAction`, `getEmployeeAction`, `getShiftAssignmentsAction` have no `requireAuth()` or `requireRole()`. Any authenticated employee could enumerate all org data.

7. **[Security] Stats actions accessible to all roles** — `src/actions/attendance-stats.ts:22,119`
   `getAttendanceStatsAction` and `getAttendanceTrendAction` use `requireAuth()` + admin client — any employee sees org-wide stats.
   Fix: Use `requireRole("admin", "hr_officer")`.

8. **[Performance] N+1 in batchClockInAction** — `src/actions/supervisor.ts:125-129`
   Sequential `resolveEmployeeShift` per employee = 2 queries x N employees. 50 employees = 100 serial DB round-trips.
   Fix: Batch-fetch all shift assignments in one query.

9. **[Performance] N+1 in batchClockOutAction** — `src/actions/supervisor.ts:207-251`
   Sequential shift fetch + update per record. Same scaling issue.
   Fix: Pre-fetch unique shifts, batch updates.

10. **[Performance] clockInAction 7-9 sequential queries** — `src/actions/attendance.ts:41-199`
    Auth(2) + employee + location + duplicate check + shift(2) + insert = 7-9 serial queries.
    Fix: `Promise.all` for independent queries (employee + existing check parallelizable).

11. **[Performance] Browser Supabase client not singleton** — `src/lib/supabase/client.ts`
    `createClient()` creates a new instance each call — multiple WebSocket connections, duplicate Realtime subscriptions.
    Fix: Cache the client instance in module scope.

12. **[Performance] Report actions fetch unbounded datasets into memory** — `src/actions/reports.ts`
    All 6 reports fetch all records in date range for client-side aggregation. 500 employees x 30 days = 15,000+ rows in memory.
    Fix: Move aggregation to PostgreSQL (GROUP BY, RPC, or views).

13. **[Performance] getAttendanceStatsAction fetches all employees to count** — `src/actions/attendance-stats.ts:30-41`
    Fetches every active employee with joined location just for counting/grouping.
    Fix: Use `select("*", { count: "exact", head: true })` + grouped query.

14. **[Architecture] Duplicate requireHrOrAdmin in 2 files** — `src/actions/reports.ts:18-24`, `hr-actions.ts:24-29`
    Identical function. Use `requireRole("admin", "hr_officer")` from dal.ts.

15. **[Architecture] Duplicate resolveEmployeeShift in 2 files** — `src/actions/attendance.ts:22-39`, `supervisor.ts:17-34`
    Extract to `src/lib/shifts/resolve.ts`.

16. **[Architecture] Reports page god component ~996 lines** — `src/components/reports/reports-page.tsx`
    6 tab components + 2 helpers in one file. Extract each tab to its own file.

## Recommendations (MEDIUM + LOW)

### MEDIUM

17. **[Security] No security headers** — `next.config.ts` (MEDIUM)
    Missing CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy.

18. **[Security] No rate limiting on auth endpoints** — `src/actions/auth.ts` (MEDIUM)
    Login/signup/reset callable without throttling.

19. **[Security] xlsx dependency vulnerability** — `package.json` (MEDIUM)
    1 high-severity vuln (Prototype Pollution + ReDoS). Consider `exceljs` alternative.

20. **[Security] Missing Zod on batchClockOutAction** — `src/actions/supervisor.ts:182` (MEDIUM)

21. **[Security] Missing Zod on flagAnomalyAction** — `src/actions/supervisor.ts:372` (MEDIUM)

22. **[Performance] resolveEmployeeShift makes 2 queries** — `src/actions/attendance.ts:22-39` (MEDIUM)
    RPC returns shift ID, then fetches full shift. RPC should return full row.

23. **[Performance] Dashboard sequential queries** — `src/app/(dashboard)/dashboard/page.tsx:29-42` (MEDIUM)
    Pending count + stats queries should use `Promise.all`.

24. **[Performance] getShiftsAction fetches ALL shift_assignments** — `src/actions/shifts.ts:95-98` (MEDIUM)

25. **[Performance] getAttendanceTrendAction client-side grouping** — `src/actions/attendance-stats.ts:140` (MEDIUM)

26. **[Performance] generateDailySummaryIfNeeded 4 serial queries** — `src/lib/notifications/create.ts:102-167` (MEDIUM)

27. **[Performance] clockOutAction 5+ serial queries** — `src/actions/attendance.ts:201-317` (MEDIUM)
    Combine attendance + location with a join.

28. **[Performance] No pagination on lists** — employees, notifications, audit log (MEDIUM)

29. **[Performance] Service worker no cache eviction** — `public/sw.js:33-54` (MEDIUM)
    Old deploy assets never evicted. Cache grows unbounded.

30. **[Architecture] Error handling inconsistency** — auth actions return `ActionState`, others throw (MEDIUM)

31. **[Architecture] Duplicate AttendanceTrendPoint** — `src/lib/validations/reports.ts:111` + `attendance-stats.ts:112` (MEDIUM)

32. **[Quality] 3 duplicate StatCard components** — admin/hr/supervisor dashboards (MEDIUM)

### LOW

33. **[Quality] Unused WelcomeBanner component** — `src/components/dashboard/welcome-banner.tsx` (LOW)
34. **[Quality] Unused getLocationWithCountAction** — `src/actions/locations.ts:91-109` (LOW)
35. **[Quality] Unused exported types** — auth.ts, reports.ts, attendance.ts, notifications.ts validations (LOW)
36. **[Quality] Dead no-op ternary** — `src/actions/auth.ts:40` `SUPABASE_URL ? "" : ""` (LOW)
37. **[Quality] Duplicate VALID_ROLES** — `src/actions/admin.ts:8` + `employees.ts:14` (LOW)
38. **[Quality] todayStart pattern repeated 6x** — Extract to utility (LOW)
39. **[Quality] proxy.ts naming misleading** — Should be middleware.ts (LOW)
40. **[Performance] Leaflet CSS/setup duplicated in 3 components** (LOW)
41. **[Performance] NotificationBell resize listener no debounce** (LOW)
42. **[Security] Report actions missing date range validation** — `src/actions/reports.ts` (LOW)
43. **[Security] Admin client used unnecessarily in server components** — dashboard pages (LOW)

## Positive Findings

- No service_role key exposure in client code
- No `dangerouslySetInnerHTML`, `eval()`, `innerHTML` anywhere
- `.env*` properly gitignored, never committed
- `NEXT_PUBLIC_` limited to safe values (URL, publishable key)
- All mutation actions have `requireRole`/`requireAuth` guards
- Zod validation on all form-handling server actions
- User identity always derived from server-side `auth.getUser()`
- Service worker minimal and secure (skips POST/server actions)
- Admin routes protected with `requireRole("admin")`
- xlsx dynamically imported, Leaflet/Recharts SSR-disabled
- Zero `any` types in entire codebase
- RLS on all 9 tables verified

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| HIGH | 11 |
| MEDIUM | 16 |
| LOW | 11 |
| **Total** | **43** |

**Status: has_blockers** — 5 CRITICAL issues must be resolved before production deployment.

**Priority order:**
1. Fix CRITICAL security issues (#1-5)
2. Add missing auth guards (#6-7)
3. Fix N+1 and query performance (#8-13)
4. Consolidate duplicated code (#14-16)
5. Add security headers and rate limiting (#17-18)

---

*Previous review (2026-04-01 — build-only): status: clean, 0 findings*
