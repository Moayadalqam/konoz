---
date: 2026-04-05 13:15
mode: web
critical_count: 3
high_count: 8
medium_count: 12
low_count: 8
status: has_blockers
---

# Web Production Audit — 2026-04-05

**Project:** Kunoz (Workforce Attendance Management)
**Stack:** Next.js 16 + Supabase + Vercel + PWA
**Agents:** security-auditor, performance-oracle, architecture-strategist, checklist-scanner

---

## Blockers (CRITICAL + HIGH)

### CRITICAL

- **[C1]** `src/scripts/seed-admin.ts:10-11` — Hardcoded admin credentials (`admin@kunoz.sa` / `KunozAdmin2026!`) in source code. Anyone reading the repo has admin access if these were used. (SECURITY)

- **[C2]** `src/app/auth/callback/route.ts:7,13` — Open redirect via unvalidated `next` query parameter. Attacker can craft `/auth/callback?code=...&next=//evil.com` to redirect users post-auth. (SECURITY)

- **[C3]** `src/actions/attendance.ts:77-91` — Race condition allows duplicate open clock-ins. SELECT-then-INSERT is not atomic. Two rapid taps can create two open records. Fix: add partial unique index `WHERE clock_out IS NULL`. (DATA INTEGRITY)

### HIGH

- **[H1]** `src/proxy.ts` — Middleware is dead code. No `middleware.ts` file exists to import/export the proxy function. All routes are unprotected at the network layer. Server actions still enforce auth, but session refresh and redirect logic don't run. (SECURITY)

- **[H2]** `src/actions/employees.ts:149,178` — `getEmployeesAction` and `getEmployeeAction` have no `requireAuth()` or `requireRole()`. Any authenticated user can list all employees. (SECURITY)

- **[H3]** `src/actions/notifications.ts:40-51,69-80` — `markNotificationReadAction` and `deleteNotificationAction` don't verify ownership. Any user can suppress another user's notifications. (SECURITY)

- **[H4]** Missing entirely — No rate limiting on auth endpoints. Brute-force attacks possible. (SECURITY)

- **[H5]** `package.json` — `xlsx` dependency has high-severity vulnerability (prototype pollution + ReDoS). (DEPENDENCY)

- **[H6]** `src/actions/supervisor.ts:207-250,125-129` — N+1 query pattern in batch clock-in/out. Each employee triggers 2 sequential DB queries for shift resolution. 50 employees = 100 queries. (PERFORMANCE)

- **[H7]** All files using `new Date(); setHours(0,0,0,0)` — Timezone handling uses server-local time (UTC on Vercel). Jordan is UTC+3. Clock-ins between midnight and 3 AM are misattributed to previous day. (DATA INTEGRITY)

- **[H8]** `src/app/install/page.tsx` — "Konouz" vs "Kunoz" brand name conflict. Install page uses "KONOUZ SUITE" while rest of app uses "KUNOZ". (BRAND/UX)

## Recommendations (MEDIUM + LOW)

### MEDIUM

- **[M1]** `supabase/migrations/` — No migration files in version control. RLS status unknown. (SECURITY)
- **[M2]** `next.config.ts` — No security headers (CSP, HSTS, X-Frame-Options). (SECURITY)
- **[M3]** `src/lib/validations/auth.ts:7` — Weak password policy (min 8 chars, no complexity). (SECURITY)
- **[M4]** `src/actions/locations.ts:79,111` — Location actions missing role check. (SECURITY)
- **[M5]** `src/actions/shifts.ts:82,150` — Shift actions missing auth check. (SECURITY)
- **[M6]** `src/actions/employees.ts:167-169` — PostgREST `.or()` with unsanitized input. (SECURITY)
- **[M7]** All action files — Zero `Promise.all` usage. Independent queries run sequentially. (PERFORMANCE)
- **[M8]** All action files — No caching strategy. (PERFORMANCE)
- **[M9]** `supervisor-attendance.tsx:597` — Raw `<img>` instead of `next/image`. (PERFORMANCE)
- **[M10]** `src/app/global-error.tsx` — Missing. Root errors show blank page. (RELIABILITY)
- **[M11]** Auth pages — Code duplication: SubmitButton, PasswordInput, styling repeated 5x. (ARCHITECTURE)
- **[M12]** `users-table.tsx:44` — Residual teal color from old brand. (DESIGN)

### LOW

- **[L1]** `install/page.tsx:199` — Hardcoded "Mr. Moawia". Should be dynamic. (UX)
- **[L2]** `install/page.tsx:264` — iOS install uses `alert()`. (UX)
- **[L3]** `supervisor.ts:363` — Note actions don't check location ownership. (SECURITY)
- **[L4]** `attendance.ts:131` — No photo upload size validation. (SECURITY)
- **[L5]** `welcome-overlay.tsx:10` — Dead variable. (CODE QUALITY)
- **[L6]** Multiple pages — Title separators inconsistent. (CONSISTENCY)
- **[L7]** Chart components — Hardcoded hex colors. (DESIGN)
- **[L8]** `slide-2.png` — 450KB, should be WebP. (PERFORMANCE)

---

## Shipping Checklist

| # | Check | Result |
|---|---|---|
| 1 | Meta tags (title + description) | PASS |
| 2 | Open Graph tags | WARN — missing |
| 3 | Favicon | WARN — no favicon.ico |
| 4 | Viewport | PASS |
| 5 | HTTPS | PASS (Vercel) |
| 6 | not-found.tsx | PASS |
| 7 | global-error.tsx | FAIL — missing |
| 8 | .env in .gitignore | PASS |
| 9 | No console.log in prod | PASS |
| 10 | No TODO/FIXME | PASS |
| 11 | Service worker | PASS |
| 12 | PWA manifest | PASS |
| 13 | Image optimization | WARN — slide-2.png 450KB |
| 14 | Build | PASS |
| 15 | TypeScript | PASS |
| 16 | No hardcoded URLs | PASS |

---

## Positive Findings

- Service role key properly isolated (never in client components)
- Zero XSS vectors (no dangerouslySetInnerHTML, eval)
- Zod validation on all mutations
- Server actions provide built-in CSRF protection
- Auth derived from auth.uid(), never client IDs
- Registration approval flow working (pending -> approved)
- Admin routes properly role-gated
- Responsive design excellent (mobile cards + desktop tables)
- PWA architecture well-structured (SW, offline sync, install prompt)
- Splash screen handles prefers-reduced-motion
- Crimson+gold brand 95% complete and cohesive

---

## Previous Review

### Review: Kunoz v1.0 — 2026-04-01

Status: clean. All 7 phases verified via UAT. No blockers.
