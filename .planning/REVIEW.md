---
date: 2026-04-05 15:45
mode: web
critical_count: 0
high_count: 0
medium_count: 12
low_count: 8
status: clean
---

# Review — 2026-04-05 (Post-Fix Update)

## Quality Gates

| Check | Status |
|-------|--------|
| TypeScript | PASS — 0 errors |
| ESLint | PASS — 0 warnings |
| Build | PASS — 24 routes |
| npm audit | PASS — 0 vulnerabilities |

## All HIGHs Resolved This Session

- ~~H1~~ CSP header — ADDED (`next.config.ts`, strict directives for self/supabase/sentry/osm)
- ~~H2~~ Error tracking — ADDED (`@sentry/nextjs` installed, client/server/edge configs, `global-error.tsx`)
- ~~H3~~ RLS audit — VERIFIED (all 9 tables have RLS enabled via Supabase API, `supabase/RLS_AUDIT.md`)
- ~~H4~~ Raw error leaks — FIXED (`handleActionError()` wired into all 12 action files, maps DB errors to user-friendly messages)
- ~~H5~~ Structured logging — ADDED (`src/lib/logger.ts` with JSON output, timestamp, action context)
- ~~H6~~ Shift N+1 — FIXED (collapsed 2 queries into 1 joined query in `resolve.ts`)
- ~~H7~~ clockOut sequential — FIXED (location + shift queries parallelized with `Promise.all`)

## Fixed Since Last Review (2026-04-02)

- ~~C1~~ Base UI #31 — FIXED properly (select.tsx Icon/ItemIndicator + supervisor DropdownMenuTrigger render props, topbar DropdownMenuLabel wrapped in Group)
- ~~C2~~ Recharts -1 dimensions — FIXED properly (replaced ResponsiveContainer with ResizeObserver-based measurement, only renders when dimensions > 0)
- ~~C3~~ Seed creds in .env.local.example — previously fixed
- ~~H1~~ Supervisor location ownership — previously fixed
- ~~H8~~ Ambiguous FK joins — previously fixed
- ~~5 CRITICAL security issues~~ — fixed in QT1 (open redirect, hardcoded creds, IDOR, filter injection)
- ~~HIGH auth + deduplication~~ — fixed in QT2 (auth guards, stats role check, consolidation)
- ~~HIGH performance + MEDIUM~~ — fixed in QT3 (browser Supabase singleton, security headers, Zod, dead code)
- ~~MEDIUM+LOW batch~~ — fixed in QT4 (utilities, unused types, phone placeholder, admin client)

## Blockers (HIGH)

None — all 7 HIGHs resolved (see above).

## Recommendations (MEDIUM)

1. **Timezone bug** — `src/lib/date-utils.ts:3` uses `new Date()` (UTC on Vercel) not Jordan time. Records between midnight-3AM Jordan time attributed to wrong day. Fix: use `Asia/Amman` timezone.
2. **In-memory rate limiter ineffective on Vercel** — `src/lib/rate-limit.ts` uses Map, reset per serverless invocation. Fix: Upstash Redis or accept as dev-only.
3. **Missing global-error.tsx** — no fallback if root layout crashes. Fix: create `src/app/global-error.tsx`.
4. **5 routes missing loading.tsx** — profile, site-attendance, employees/[id], admin/users, auth group. Parent fallback exists but is generic.
5. **20+ `as unknown as` type casts** — `src/actions/reports.ts` (8), `hr-actions.ts` (9), `attendance-stats.ts` (2). Fix: generate Supabase types and create typed query helpers.
6. **Inconsistent error patterns** — auth actions return `{ error }`, all others throw. Fix: standardize on Result pattern.
7. **Data files with PII in git** — `data/locations and Employees (1).xlsx` may contain employee info. Fix: `git rm --cached data/` + `.gitignore`.
8. **getMyAttendanceAction unbounded** — `src/actions/attendance.ts:358-367` no `.limit()`. Fix: add `.limit(200)`.
9. **getSiteComparisonReport 3 sequential queries** — `src/actions/reports.ts:462-533` all independent. Fix: `Promise.all`.
10. **getAbsenceReport 2 sequential queries** — `src/actions/reports.ts:366-458`. Fix: `Promise.all`.
11. **getAttendanceStatsAction not parallelized** — `src/actions/attendance-stats.ts:24-111`. Fix: `Promise.all` first two queries.
12. **select("*") overuse** — `src/lib/auth/dal.ts:25` fetches all columns on every request via `requireAuth()`. Fix: specify needed columns.

## Recommendations (LOW)

1. updatePasswordAction missing rate limiting — `src/actions/auth.ts:148`
2. Password policy minimal (8 chars only) — `src/lib/validations/auth.ts:7`
3. No auth error boundary — `src/app/(auth)/error.tsx` missing
4. Unused exports — `haversineDistance`, `timeToMinutes`, `getShiftNetMinutes`, `getUser` exported but internal-only
5. No list virtualization — employees-table.tsx renders all rows (fine under 200)
6. Report summary no pagination — renders all employees in DOM
7. Reports page console.error leaks to browser — `src/components/reports/reports-page.tsx:151`
8. Live timer 1s re-render — `src/components/attendance/attendance-status.tsx:23-51`

## Positive Findings

- All server actions use `"use server"` + auth checks — no unauthenticated mutations
- Zero `dangerouslySetInnerHTML`, `eval()`, `innerHTML` — no XSS vectors
- No `service_role` key in any client component — properly isolated
- `.env.local` gitignored, never committed, no secrets in source
- Auth callback prevents open redirect (validates `next` param)
- Zod validation on all major action inputs
- Zero npm vulnerabilities (838 packages)
- Security headers configured (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- Rate limiting on signup (5/min), login (10/min), password reset (3/min)
- Clean unidirectional dependency graph: app → components → actions → lib
- Bundle splitting correct (Leaflet, Recharts, ExcelJS all lazy-loaded)
- Parallel queries used in key paths (clock-in, employee dashboard)
- PostgREST filter injection prevented in search inputs
- PWA offline architecture solid (IndexedDB + sync engine + conflict resolution)
- Recharts -1 and Base UI #31 console errors now properly resolved

---
*Review by: Security Auditor + Performance Oracle + Architecture Strategist (Opus 4.6)*
*3 parallel agents, 2026-04-05*

---

# Previous Review — 2026-04-02

(Archived — see git history for full content)
