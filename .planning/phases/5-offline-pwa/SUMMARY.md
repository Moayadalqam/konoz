# Phase 5: Offline & PWA — Execution Summary

## Completed Steps

### Wave 1: PWA Foundation
- **Step 1**: Created `manifest.ts` with Next.js 16 MetadataRoute, generated 192x192 and 512x512 PNG icons with teal "K" branding, updated layout.tsx with apple-mobile-web-app meta tags
- **Step 2**: Created manual `public/sw.js` with app shell caching (network-first for navigation, cache-first for static assets), `register-sw.ts` utility, `sw-register.tsx` client component wired into root layout, security headers in `next.config.ts`

### Wave 2: Offline Attendance
- **Step 3**: Installed `idb`, created `offline-store.ts` with IndexedDB database "kunoz-offline", session_id-based linkage for offline clock-in/clock-out pairs, status transitions (pending→syncing→synced/failed)
- **Step 4**: Created `offline-attendance.ts` with `attemptClockIn`/`attemptClockOut` (try server first, fall back to IndexedDB), `safeTodayStatus` for offline-safe status fetch, `isNetworkError` detection. Modified `clock-in-button.tsx` with offline success state, offline "clocked in" state, session_id tracking

### Wave 3: Sync, Status & Install
- **Step 5**: Created `sync-engine.ts` processing clock-ins before clock-outs, patching attendance_id for session-linked clock-outs, conflict resolution (server wins for duplicates), max 3 retry attempts. Created `sync-provider.tsx` with online/offline listeners, visibilitychange trigger, 30s polling interval, proper cleanup
- **Step 6**: Created `connection-status.tsx` showing green dot (online), amber "Offline" pill, pulsing blue (syncing), red "failed" with click-to-review. Created `failed-sync-dialog.tsx` with per-action retry/discard and "Retry All"
- **Step 7**: Created `install-prompt.tsx` with beforeinstallprompt for Android, iOS share instructions, visit counting (show after 2+ visits), dismissible with localStorage persistence

## Files Created
| File | Description |
|------|-------------|
| `src/app/manifest.ts` | PWA web manifest |
| `public/sw.js` | Service worker with app shell caching |
| `public/icon-192x192.png` | PWA icon (192x192) |
| `public/icon-512x512.png` | PWA icon (512x512) |
| `src/lib/pwa/register-sw.ts` | Service worker registration |
| `src/lib/pwa/offline-store.ts` | IndexedDB store for offline actions |
| `src/lib/pwa/offline-attendance.ts` | Offline clock-in/out with network fallback |
| `src/lib/pwa/sync-engine.ts` | Sync queue processor with conflict resolution |
| `src/components/pwa/sw-register.tsx` | SW registration React component |
| `src/components/pwa/sync-provider.tsx` | Sync context provider |
| `src/components/pwa/connection-status.tsx` | Online/offline indicator |
| `src/components/pwa/failed-sync-dialog.tsx` | Failed sync review dialog |
| `src/components/pwa/install-prompt.tsx` | PWA install prompt |
| `src/components/pwa/dashboard-pwa-wrapper.tsx` | Dashboard layout PWA wrapper |

## Files Modified
| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Added ServiceWorkerRegister, PWA metadata |
| `src/app/(dashboard)/layout.tsx` | Wrapped with DashboardPwaWrapper |
| `src/components/layout/topbar.tsx` | Added ConnectionStatus indicator |
| `src/components/attendance/clock-in-button.tsx` | Replaced direct server actions with offline-aware wrappers, added offline states |
| `next.config.ts` | Added SW security headers |
| `package.json` | Added `idb` dependency |

## Notes
- No Serwist/next-pwa dependency — manual SW per Next.js 16 official guide
- `idb` is the only new dependency (~1KB gzipped)
- Session_id linkage solves offline clock-out after offline clock-in (attendance_id not yet available)
- Safari iOS supported via visibilitychange + online events (no Background Sync API needed)
- Build passes with 0 TypeScript errors
- Existing online attendance flows unchanged

---
*Executed: 2026-03-31*
