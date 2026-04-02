---
date: 2026-04-02 12:15
mode: web
critical_count: 3
high_count: 10
medium_count: 14
low_count: 8
status: has_blockers
---

# Review — 2026-04-02 (Full Production Audit)

## Quality Gates

| Check | Status |
|-------|--------|
| TypeScript | PASS — 0 errors |
| ESLint | PASS — 0 warnings |
| Build | PASS — 24 routes |
| npm audit | PASS — 0 vulnerabilities |

## Blockers (CRITICAL)

### C1. Base UI Error #31 — render prop receives JSX element instead of component
- `src/components/notifications/notification-dropdown.tsx:130` — `render={<Link>}`
- `src/components/layout/topbar.tsx:61` — `render={<Link>}`
- `src/components/ui/dialog.tsx:112` — `render={<Button>}`
- `src/components/ui/sheet.tsx:64-69` — `render={<Button>}`
- **Fix:** Change `render={<Link .../>}` to `render={(props) => <Link {...props} .../>}`

### C2. Recharts width/height -1 on tab switch
- `src/components/reports/attendance-trend-chart.tsx:78`
- `src/components/reports/site-comparison-chart.tsx:78`
- **Fix:** Defer chart render until after mount with `requestAnimationFrame`

### C3. Admin seed password pattern in .env.local.example
- `.env.local.example:5-6` — `SEED_ADMIN_PASSWORD=change-me-in-production`
- **Fix:** Remove seed credentials from .env.local.example, rotate actual admin password

## Blockers (HIGH)

### H1. Supervisor actions skip location ownership check
- `src/actions/supervisor.ts:347-365` — `addAttendanceNoteAction` doesn't verify record belongs to supervisor's site
- `src/actions/supervisor.ts:372-403` — `flagAnomalyAction` same issue
- **Fix:** Add `.eq("location_id", supervisor.primary_location_id)` check

### H2. No SQL migrations in repo — RLS policies not version-controlled
- No `supabase/migrations/` directory exists
- **Fix:** Run `supabase init && supabase db pull` to capture schema

### H3. updatePasswordAction missing rate limiting
- `src/actions/auth.ts:148-172` — no `isRateLimited()` call unlike other auth actions
- **Fix:** Add rate limit check matching login/signup pattern

### H4. Client-controllable limit on getNotificationsAction
- `src/actions/notifications.ts:10` — accepts any limit from client
- **Fix:** Clamp to `Math.min(Math.max(1, limit), 100)`

### H5. 20+ `as unknown as` type casts on Supabase joins
- Throughout `src/actions/reports.ts`, `hr-actions.ts`, `attendance-stats.ts`
- **Fix:** Run `supabase gen types typescript` and replace all casts

### H6. Inconsistent server action error patterns — throw vs return
- Auth actions return `{ error }`, all others throw `new Error()`
- **Fix:** Standardize on `Result<T>` pattern across all actions

### H7. resolveEmployeeShift makes 2 sequential queries per call
- `src/lib/shifts/resolve.ts:12-25` — RPC then separate shift fetch
- Batch clock-in with 50 employees = 100 queries
- **Fix:** Modify RPC to return full shift row, or batch-fetch for batch operations

### H8. Admin dashboard sequential queries
- `src/app/(dashboard)/dashboard/page.tsx:30-43` — pendingCount then stats
- `src/actions/attendance-stats.ts:56-82` — overtime query sequential
- **Fix:** Parallelize with `Promise.all`

### H9. clockOutAction — 4 sequential queries before update
- `src/actions/attendance.ts:183-265` — employee, record, location, shift in series
- **Fix:** Parallelize location + shift fetch after record fetch

### H10. Three Google Fonts blocking FCP
- `src/app/layout.tsx:7-21` — Plus Jakarta Sans + Inter + JetBrains Mono
- **Fix:** Add `display: "swap"`, limit weights, consider dropping Inter

## Recommendations (MEDIUM)

1. **Timezone bug** — `src/lib/date-utils.ts:3` uses server timezone (UTC on Vercel) not Jordan time. Records between midnight-3AM Jordan time attributed to wrong day. Fix: use `Asia/Amman` timezone explicitly.
2. **No CSP header** — `next.config.ts:3-12` missing Content-Security-Policy
3. **In-memory rate limiter ineffective on Vercel** — `src/lib/rate-limit.ts` uses Map, not shared across serverless invocations
4. **getEmployeesAction accessible to employees** — `src/actions/employees.ts:147` only requires `requireAuth()`, should require HR/admin role
5. **getLocationsAction exposes GPS to all users** — `src/actions/locations.ts:79-90` only requires `requireAuth()`
6. **Input validation gaps** — `src/actions/attendance-stats.ts:113` no bounds on `days` param, `src/actions/hr-actions.ts:526` no Zod on filter params
7. **Middleware uncertain** — `src/proxy.ts` exports `proxy` but no `middleware.ts` exists
8. **ClockInButton 527 lines** — 8+ UI states in one component, should decompose
9. **Duplicated formatTime** — 5 independent implementations across components
10. **Duplicated requireHrOrAdmin** — defined in both `reports.ts` and `hr-actions.ts`
11. **Reports tab no client caching** — refetches on every tab switch
12. **getMyAttendanceAction unbounded** — `src/actions/attendance.ts:339-368` no `.limit()`
13. **Summary table no pagination** — renders all employees in DOM at once
14. **Live timer 1s interval re-renders entire component tree** — `src/components/attendance/attendance-status.tsx:23-51`

## Recommendations (LOW)

1. `clockOutAction` missing `employee_id` guard on final update — `src/actions/attendance.ts:266-281`
2. Password policy minimal (only min 8 chars) — `src/lib/validations/auth.ts:5`
3. Admin client creates new instance on every call — `src/lib/supabase/admin.ts` (not singleton)
4. Realtime channel stays open when tab not visible — `src/components/notifications/notification-bell.tsx:51-79`
5. Inline role checks in pages duplicate `requireRole` logic — reports, hr-actions, attendance pages
6. Supervisor-attendance.tsx has ~330 lines of duplicate desktop/mobile rendering
7. Seed credential comments in `.env.local.example` telegraph password patterns
8. `isBusinessDay` hardcodes Friday as weekend — `src/actions/reports.ts:24`

## Positive Findings

- All server actions use `"use server"` directive and auth checks
- No `dangerouslySetInnerHTML`, `eval()`, or `innerHTML` anywhere
- No `service_role` key in client components
- `.env.local` properly gitignored, never committed
- Auth callback prevents open redirect
- Zod validation on all major action inputs
- Zero npm vulnerabilities
- Security headers configured (X-Frame-Options, HSTS, X-Content-Type-Options)
- Clean unidirectional dependency graph: app → components → actions → lib
- Bundle splitting well-handled (Leaflet, Recharts, ExcelJS all lazy-loaded)
- Parallel queries already used in several key paths (employee dashboard, clock-in)
- PostgREST filter injection prevented in search inputs

---
*Review by: Security Auditor + Performance Oracle + Architecture Strategist (Opus 4.6)*
*3 agents, ~675s total analysis time*
