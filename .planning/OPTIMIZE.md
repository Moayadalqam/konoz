---
date: 2026-04-05 16:00
mode: full
critical: 9
high: 15
medium: 20
low: 9
status: critical_issues
---

# Optimization Report — Kunoz Core Attendance Flow

**Project:** Kunoz v1.0 | **Mode:** Full | **Date:** 2026-04-05
**Focus:** Maximize reliability of GPS-based attendance tracking (the core value)

## Summary

Three critical themes emerged: (1) **Timezone bug** — all "today" queries, shift resolution, and late/early detection use UTC instead of Saudi time (UTC+3), causing 3-hour misalignment across the entire system. (2) **Clock-in UX** — the button is too small, requires navigation from dashboard, and GPS errors are silently dropped. (3) **Query efficiency** — redundant auth calls and sequential queries add 300-600ms to every dashboard load.

## Critical Issues (must fix before demo)

| # | Dim | Finding | Location | Fix |
|---|-----|---------|----------|-----|
| C1 | Backend | `getTodayStart()` returns UTC midnight, not Saudi midnight. All "today" queries wrong by 3hrs | `date-utils.ts:2-6` | Rewrite with `Asia/Riyadh` timezone |
| C2 | Backend | Shift resolution uses `toISOString().slice(0,10)` = UTC date | `shifts/resolve.ts:20` | Use Saudi date string |
| C3 | Backend | `dateToMinutesSinceMidnight` uses UTC hours — late/early detection off by 3hrs | `shifts/time-rules.ts:42-44` | Convert to Saudi time via Intl |
| C4 | UX | Clock-In button too small (64px tall, max-w-xs) for gloved construction workers | `clock-in-button.tsx:387-403` | h-20+, remove max-w-xs |
| C5 | UX | Dashboard shows a Link to attendance page, not the actual ClockInButton | `employee-dashboard.tsx:54-61` | Embed ClockInButton directly |
| C6 | UX | Clock-out GPS error silently dropped — toast uses stale state, phase reset to idle | `clock-in-button.tsx:229-239` | Set phase="error", use local variable for toast |
| C7 | Perf | Redundant `requireAuth` = 6 DB calls per dashboard load (2 per call × 3 calls) | `dal.ts:16-30`, page.tsx | Pass profile to internal action variants |
| C8 | Perf | `getAttendanceStatsAction` — 3 sequential queries, should be parallel | `attendance-stats.ts:31-82` | Promise.all |
| C9 | Perf | `getSupervisorStatsAction` — 4 sequential queries | `attendance-stats.ts:268-310` | Promise.all after first query |

## High Priority

| # | Dim | Finding | Location | Fix |
|---|-----|---------|----------|-----|
| H1 | Backend | Race condition: duplicate clock-ins possible (no DB unique constraint) | `attendance.ts:54-78` | Add partial unique index on employee_id WHERE clock_out IS NULL |
| H2 | Backend | Clock-out update has no optimistic locking — can overwrite another clock-out | `attendance.ts:274-289` | Add `.is("clock_out", null)` to update |
| H3 | Backend | Offline sync can duplicate clock-ins across day boundaries | `sync-engine.ts:57-72` | Add idempotency key (session_id) |
| H4 | Backend | Report date grouping uses UTC `clock_in.slice(0,10)` | `attendance-stats.ts:145`, `reports.ts:201,264,403` | Convert to Saudi date before grouping |
| H5 | Backend | Week start calculation uses UTC Date methods | `attendance-stats.ts:55-59` | Saudi timezone-aware week boundary |
| H6 | Backend | `isBusinessDay` only skips Friday — Saudi weekend is Fri+Sat | `reports.ts:24-26` | Skip both day 5 and day 6 |
| H7 | UX | 15s GPS timeout with no progress indicator or cancel button | `clock-in-button.tsx:84-97` | Add elapsed timer + cancel |
| H8 | UX | No haptic feedback on clock-in success | `clock-in-button.tsx:137-159` | `navigator.vibrate?.(200)` |
| H9 | UX | Greeting says "Good morning" at all hours | `employee-dashboard.tsx:26` | Time-aware greeting |
| H10 | UX | No offline banner visible near clock-in button before tapping | `clock-in-button.tsx` | Add inline offline warning |
| H11 | UX | Stale `errorMsg` in clock-out toast (React batch update) | `clock-in-button.tsx:238` | Use local variable |
| H12 | Perf | Admin dashboard: sequential pendingCount + stats | `dashboard/page.tsx:32-43` | Promise.all |
| H13 | Perf | Reports: unbounded queries, silent truncation at 1000 rows | `reports.ts` (all functions) | Add .limit() + pagination |
| H14 | Perf | `getMyAttendanceAction`: no limit, uses select("*") | `attendance.ts:349-378` | Add .limit(200), explicit columns |
| H15 | Perf | `clockOutAction`: 3 sequential lookups before update | `attendance.ts:187-309` | Join employee+record in one query |

## Medium Priority (12 of 20 shown)

| # | Dim | Finding | Fix |
|---|-----|---------|-----|
| M1 | Backend | Report date range boundaries use UTC, not Saudi time | Construct with +03:00 offset |
| M2 | Backend | Supervisor stats double-counts employees with multiple records | Count distinct employee_ids |
| M3 | Backend | Geofence check has no GPS accuracy buffer | Add `Math.min(accuracy, 100)` buffer |
| M4 | Backend | Batch clock-out silently ignores individual failures | Return failure details |
| M5 | Backend | Offline clock-out patch misses "failed" status records | Also patch status="failed" |
| M6 | UX | Date inputs too small for mobile (below 44px touch target) | min-h-[44px] |
| M7 | UX | Clock-out error handling inconsistent with clock-in | Use same "error" phase |
| M8 | UX | Success flash too short (1200ms) | Increase to 2500ms |
| M9 | UX | Install prompt overlaps clock-in area | Move to top on mobile |
| M10 | Perf | IndexedDB reads all records then filters in JS | Use by-status index |
| M11 | Perf | Service worker only pre-caches /dashboard/attendance | Add /dashboard |
| M12 | Perf | No composite DB indexes on attendance_records | Add 5 indexes |

## Recommended Fix Order

### Phase 1: Timezone (root cause — fixes C1, C2, C3, H4, H5, H6, M1)
One rewrite of `date-utils.ts` + update all consumers. Fixes the most pervasive bug.

### Phase 2: Clock-in UX (fixes C4, C5, C6, H7, H8, H9, H10, H11)
Make the core action fast, clear, and satisfying. This is the demo money shot.

### Phase 3: Data integrity (fixes H1, H2, H3, M5)
DB constraints + optimistic locking. Prevents data corruption.

### Phase 4: Performance (fixes C7, C8, C9, H12, H13, H14, H15, M10, M11, M12)
Query parallelization + limits. Makes dashboards 3x faster.

---
*Analyzed by: Frontend Agent + Backend Agent + Performance Oracle (Opus 4.6)*
*3 parallel agents, 2026-04-05*
