# Offline-First Architecture Research: Kunoz Attendance System

**Domain:** Workforce attendance tracking (construction sites, Saudi Arabia)
**Researched:** 2026-03-31
**Overall Confidence:** HIGH (verified across official docs, multiple sources)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [PWA with Next.js](#1-pwa-progressive-web-app-with-nextjs)
3. [Offline Data Storage & Sync](#2-offline-data-storage--sync)
4. [GPS & Geofencing in Browsers](#3-gps--geofencing-in-browsers)
5. [Connectivity Detection](#4-connectivity-detection)
6. [Timestamp Integrity & Anti-Fraud](#5-timestamp-integrity--anti-fraud)
7. [Photo Capture for Verification](#6-photo-capture-for-verification)
8. [Recommended Architecture](#7-recommended-architecture)
9. [Critical Pitfalls](#8-critical-pitfalls)
10. [Saudi Market Context](#9-saudi-market-context)
11. [Sources](#sources)

---

## Executive Summary

Building an offline-first attendance system as a PWA is fully feasible with the current web platform, but requires deliberate architecture decisions. The web platform in 2026 supports all the critical capabilities Kunoz needs -- installable PWAs, IndexedDB for local storage, the Geolocation API for GPS capture, camera access for photo verification, and service workers for offline caching. The main gaps are background geolocation (not available in PWAs) and Background Sync API support (Chromium-only, no Safari/Firefox). Both gaps have well-established workarounds that are sufficient for this use case.

**The core architecture is:** Serwist for service worker management, `idb` (Jake Archibald's IndexedDB wrapper) for a custom sync queue, Haversine formula for client-side geofence validation, and server-side re-validation on sync. This approach is simpler and more maintainable than PowerSync or RxDB for this use case because Kunoz's data flow is unidirectional (check-in events flow from device to server) -- there is no need for bidirectional real-time sync.

**Key insight:** Kunoz is not a collaborative editing tool. Attendance records are append-only events created by one device and sent to one server. This dramatically simplifies the offline architecture compared to general-purpose local-first apps. We do not need CRDTs, vector clocks, or complex merge strategies. A simple sync queue with last-write-wins on the server timestamp is correct here.

---

## 1. PWA (Progressive Web App) with Next.js

### 1.1 Serwist: The Recommended Service Worker Library

**Recommendation: Use Serwist** (`@serwist/next` + `serwist`)
**Confidence: HIGH** -- officially recommended in Next.js docs as of v16.2.1

Serwist is the successor to `next-pwa` (now unmaintained) and is built on Google's Workbox. It provides zero-config service worker generation for Next.js with full customization available.

**Installation:**
```bash
npm i @serwist/next && npm i -D serwist
```

**Key configuration in `next.config.ts`:**
- Wrap with `withSerwistInit` from `@serwist/next`
- Set `swSrc: "app/sw.ts"` and `swDest: "public/sw.js"`
- Optionally add `additionalPrecacheEntries` for offline fallback pages

**Critical caveat: Turbopack incompatibility.** Next.js 16 defaults to Turbopack, but Serwist requires Webpack. The build script must use `next build --webpack`. Serwist is disabled in development mode due to Turbopack. The service worker only activates in production builds.

**TypeScript setup requires:**
- Adding `"@serwist/next/typings"` to `tsconfig.json` types
- Adding `"webworker"` to the `lib` array
- Excluding `"public/sw.js"` from compilation

### 1.2 Caching Strategies for Kunoz

The service worker (`app/sw.ts`) should use Serwist's `defaultCache` as a baseline, then add custom runtime caching rules:

| Resource Type | Strategy | Rationale |
|---------------|----------|-----------|
| App shell (HTML, CSS, JS) | **Precache** | Must load instantly offline. Serwist auto-generates the precache manifest. |
| API responses (attendance data) | **NetworkFirst** | Always try fresh data, fall back to cached version. |
| Static assets (images, fonts) | **CacheFirst** | Rarely change, serve from cache for speed. |
| Google Maps tiles | **StaleWhileRevalidate** | Show cached map tiles immediately, update in background. |
| RSC prefetch requests | **StaleWhileRevalidate** | Keep UI responsive with `ExpirationPlugin` (max 200 entries, 24h TTL). |

**Available Serwist strategies:**
- `StaleWhileRevalidate` -- serve cached, update in background (best for content that changes periodically)
- `CacheFirst` -- serve cached, skip network unless cache miss (best for static assets)
- `NetworkFirst` -- try network, fall back to cache (best for API data)
- `NetworkOnly` -- never cache (for write operations)

Custom strategies are registered via `serwist.registerCapture(pattern, handler)` or the `runtimeCaching` constructor option.

### 1.3 Background Sync API

**Browser support (Confidence: HIGH, verified via MDN/CanIUse):**

| Browser | One-Off Sync | Periodic Sync |
|---------|-------------|---------------|
| Chrome / Chrome Android | Supported (v49+) | Supported (experimental) |
| Edge | Supported (v79+) | Supported (experimental) |
| Samsung Internet | Supported (v5+) | No |
| Firefox | **Not supported** | **Not supported** |
| Safari / Safari iOS | **Not supported** | **Not supported** |
| Opera | Supported (v42+) | Supported (experimental) |

**Compatibility score: 58/100** -- Chromium-only.

**Implication for Kunoz:** Most construction workers in Saudi Arabia use Android phones with Chrome or Samsung Internet. Background Sync will work for the majority of the target audience. However, **always implement a foreground fallback** that processes the sync queue on `online` events and on app load. Never rely solely on Background Sync.

**Recommended approach:**
1. Register a Background Sync event when offline actions are queued (for Chromium browsers)
2. Also listen for `online` window events to trigger sync immediately
3. Also check and process the queue on every app load/focus
4. This triple-fallback ensures sync happens on every platform

### 1.4 Web App Manifest

Next.js 16 has built-in manifest support via `app/manifest.ts`:

```typescript
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kunoz Attendance',
    short_name: 'Kunoz',
    description: 'Workforce attendance tracking',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

**Install prompt considerations:**
- Chromium browsers show automatic install prompts when manifest + HTTPS + service worker criteria are met
- iOS requires manual "Add to Home Screen" -- the app should detect iOS and show instructions
- iOS 16.4+ supports push notifications for installed PWAs

---

## 2. Offline Data Storage & Sync

### 2.1 Storage Technology: `idb` (IndexedDB wrapper)

**Recommendation: Use `idb` by Jake Archibald** (not Dexie, not RxDB, not PowerSync)
**Confidence: HIGH**

| Option | Size | What It Does | Why Not For Kunoz |
|--------|------|-------------|-------------------|
| **`idb`** | ~1.19KB brotli | Promise-based IndexedDB wrapper | **USE THIS** -- minimal, well-maintained, exactly what we need |
| Dexie.js | ~32KB | Full ORM-like wrapper with reactive queries | Overkill. Sync requires Dexie Cloud (paid) or unmaintained Syncable addon |
| RxDB | ~50KB+ | Reactive database with replication plugins | Way too heavy. Designed for collaborative apps, not append-only event logs |
| PowerSync | SDK + cloud service | Full sync engine (Postgres to SQLite) | Requires paid cloud service. Overkill for unidirectional attendance events |

**Rationale:** Kunoz attendance records are **append-only events** (clock-in, clock-out). There is no collaborative editing, no bidirectional sync, no complex queries needed on the client. The `idb` library gives us IndexedDB with promises and nothing else -- exactly the right abstraction for building a custom sync queue.

**IndexedDB storage limits:**
- Chrome: up to 60% of available disk space
- Firefox: up to 50% of available disk space
- Safari: ~1GB (but evicts after 7 days if not used as installed PWA)
- This is vastly more than enough for queued attendance records

### 2.2 Sync Queue Pattern

The sync queue is the heart of offline-first. Every user action that needs to reach the server goes into the queue first, then gets processed when connectivity allows.

**Database schema (two IndexedDB object stores):**

```typescript
// Store 1: attendance_queue (pending sync items)
interface QueueItem {
  id: string              // UUID, generated client-side
  action: 'clock_in' | 'clock_out' | 'supervisor_bulk_checkin'
  employee_id: string
  timestamp: string       // ISO 8601, captured at action time
  gps_lat: number | null
  gps_lng: number | null
  gps_accuracy: number | null
  location_id: string
  is_within_geofence: boolean
  device_time_offset: number  // difference between device clock and last known server time
  photo_blob: Blob | null     // v2: selfie for verification
  metadata: Record<string, unknown>  // notes, supervisor ID for bulk, etc.
  created_at: string
  retry_count: number
  last_error: string | null
}

// Store 2: app_state (cached reference data)
interface AppState {
  key: string             // 'locations', 'employees', 'shifts', 'last_server_time'
  value: unknown
  updated_at: string
}
```

**Sync flow:**

```
User taps "Clock In"
    |
    v
[1] Capture GPS + timestamp + device_time_offset
    |
    v
[2] Validate against cached geofence (Haversine)
    |
    v
[3] Write to IndexedDB attendance_queue
    |
    v
[4] Show success UI immediately (optimistic)
    |
    v
[5] If online: attempt immediate sync
    If offline: queue stays, synced later via:
      - Background Sync API (Chromium)
      - 'online' event listener
      - App load/focus check
    |
    v
[6] On sync: POST queue items to Supabase Edge Function
    |
    v
[7] Server validates: timestamp, GPS, geofence, device_time_offset
    |
    v
[8] On success: remove from IndexedDB queue
    On failure: increment retry_count, keep in queue
    On conflict: server wins (server timestamp is authoritative)
```

### 2.3 Conflict Resolution Strategy

**Recommendation: Server-timestamp-wins (a variant of Last-Write-Wins)**
**Confidence: HIGH**

For Kunoz, conflict resolution is straightforward because:
1. Each attendance record is created by one device for one employee
2. Records are append-only (no editing of existing records client-side)
3. The server is the source of truth for "official" attendance data

**The only realistic conflict scenario is duplicate submission** -- the same check-in sent twice (e.g., network timeout makes client think sync failed, but server received it). Handle this with:

- Client generates a UUID for each queue item
- Server uses `INSERT ... ON CONFLICT (id) DO NOTHING` (idempotent upsert)
- If the UUID already exists on the server, silently succeed

**Why NOT CRDTs or vector clocks:** CRDTs solve the problem of concurrent edits to the same data from multiple devices. Kunoz attendance records are created once, by one device, and never edited by another device. CRDTs would add complexity with zero benefit.

**Supervisor bulk check-in conflict:** If a supervisor checks in an employee offline, and the employee also self-checks-in, the server should accept both and let HR resolve it as an anomaly. This is a business process issue, not a data structure issue.

### 2.4 Supabase Offline Approach

**Supabase does not have built-in offline support.** This is confirmed by Supabase's own GitHub discussions and community. The recommended third-party integrations (PowerSync, RxDB) are overkill for Kunoz.

**Our approach:**
1. `idb` handles local IndexedDB storage
2. Custom sync queue processes items when online
3. Supabase Edge Functions receive and validate sync payloads
4. Supabase Realtime (optional) pushes updates to supervisor/HR dashboards
5. Reference data (locations, employees, shifts) is fetched on app load and cached in IndexedDB `app_state` store

This is simpler, cheaper, and more maintainable than PowerSync for our use case.

---

## 3. GPS & Geofencing in Browsers

### 3.1 Geolocation API

**Confidence: HIGH** -- universally supported in all major browsers

The browser Geolocation API is fully supported and works well for foreground location capture:

```typescript
// High-accuracy GPS for attendance check-in
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude, accuracy } = position.coords
    // accuracy is in meters -- important for geofence validation
  },
  (error) => {
    // Handle: PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT
  },
  {
    enableHighAccuracy: true,  // Use GPS hardware, not just WiFi/cell
    timeout: 10000,            // 10 seconds max
    maximumAge: 60000          // Accept cached position up to 1 minute old
  }
)
```

**Key reliability facts for mobile browsers:**
- `enableHighAccuracy: true` forces GPS hardware use (better for outdoor construction sites)
- Accuracy varies: GPS outdoors = 3-10m, WiFi = 20-50m, cell tower = 100-300m
- The `accuracy` field in the response tells you how precise the reading is
- First GPS fix can take 10-30 seconds if device hasn't used GPS recently ("cold start")
- **HTTPS is required** -- Geolocation API only works on secure origins

### 3.2 Client-Side Geofence Validation

**There is no browser Geofencing API.** The W3C proposal was abandoned. True background geofencing is a native-app-only feature.

**For Kunoz, this does not matter.** We only need geofence validation at the moment of check-in -- a foreground action where the user taps a button. This is fully achievable with the standard Geolocation API.

**Implementation: Haversine formula**

```typescript
function isWithinGeofence(
  userLat: number, userLng: number,
  fenceLat: number, fenceLng: number,
  radiusKm: number
): boolean {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371 // Earth's radius in km
  const dLat = toRad(fenceLat - userLat)
  const dLng = toRad(fenceLng - userLng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(userLat)) * Math.cos(toRad(fenceLat)) *
    Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  return distance <= radiusKm
}
```

**Performance:** The Haversine calculation takes 2-5 microseconds. Even checking against all 8 Kunoz locations is instant.

**Do NOT use Turf.js** unless you need advanced geospatial operations. The Haversine formula is 10 lines of code and adds zero dependencies.

### 3.3 Geofence Configuration

From the requirements, default geofence radius is 200m (LOC-03). This should be configurable per location because:
- Head Office (Riyadh) -- smaller building, 100m radius is fine
- Factory sites -- larger area, might need 300-500m
- Remote construction sites -- may need 500m+ due to GPS inaccuracy in open desert

**Recommendation:** Store geofence radius per location in Supabase, cache in IndexedDB. Default 200m, configurable by admin.

### 3.4 GPS Fallback When Unavailable

GPS can fail (denied permission, hardware failure, indoor locations). The system must handle this gracefully:

| Scenario | Handling |
|----------|----------|
| User denies GPS permission | Allow check-in but flag as "no GPS". Show warning. HR can see flagged entries. |
| GPS timeout (10s) | Retry once. If still fails, allow check-in with "GPS unavailable" flag. |
| Very low accuracy (>500m) | Allow check-in but flag as "low accuracy". Do not auto-validate geofence. |
| Supervisor bulk check-in | Use supervisor's GPS for all bulk-checked employees. Flag as "supervisor location". |

**Never block a check-in because GPS failed.** The primary goal is capturing the attendance event. GPS is verification, not a gate. A missing GPS entry with a timestamp is infinitely more useful than no record at all.

### 3.5 Battery and Performance

- `getCurrentPosition()` is a one-shot request -- minimal battery impact
- Do NOT use `watchPosition()` for continuous tracking (kills battery, unnecessary for check-in)
- GPS hardware powers down after the position is returned
- On modern phones, a single GPS read uses negligible battery

---

## 4. Connectivity Detection

### 4.1 `navigator.onLine` -- Unreliable, Use as Hint Only

**Confidence: HIGH** -- this is a well-documented limitation

`navigator.onLine` returns `true`/`false` but is known to be unreliable:
- `false` is trustworthy (device has no network interface active)
- `true` is NOT trustworthy (device may be on WiFi with no internet, on a captive portal, etc.)

**Never use `navigator.onLine` alone to decide if sync should happen.**

### 4.2 Network Information API

`navigator.connection` provides richer data (Chromium-only):

| Property | What It Returns | Use Case |
|----------|----------------|----------|
| `effectiveType` | `'slow-2g'`, `'2g'`, `'3g'`, `'4g'` | Adapt sync batch size |
| `downlink` | Estimated Mbps | Decide if photo upload is feasible |
| `rtt` | Round-trip time in ms | Detect unusably slow connections |
| `type` | `'cellular'`, `'wifi'`, etc. | Informational |

**Not supported in Safari or Firefox desktop.** Use as progressive enhancement only.

### 4.3 Recommended Connectivity Detection Strategy

**Use a three-layer approach:**

```typescript
// Layer 1: Quick check (unreliable but instant)
const browserSaysOnline = navigator.onLine

// Layer 2: Actual connectivity test (reliable but async)
async function hasActualConnectivity(): Promise<boolean> {
  try {
    const response = await fetch('/api/ping', {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)  // 5 second timeout
    })
    return response.ok
  } catch {
    return false
  }
}

// Layer 3: Network quality assessment (Chromium only)
function getNetworkQuality(): 'good' | 'slow' | 'unknown' {
  const conn = (navigator as any).connection
  if (!conn) return 'unknown'
  if (conn.effectiveType === '4g' && conn.rtt < 200) return 'good'
  return 'slow'
}
```

**Sync decision matrix:**

| Browser says | Ping result | Action |
|-------------|------------|--------|
| Online | Ping succeeds | Sync immediately |
| Online | Ping fails | Queue (captive portal or no real internet) |
| Offline | -- | Queue (don't even try ping) |
| Online | Ping slow (>3s) | Sync text data only, defer photo uploads |

### 4.4 User Feedback During Offline Mode

**Visual indicators that must be visible at all times:**

1. **Status bar/banner:** Persistent indicator at top of screen
   - Green dot + "Online" when connected
   - Orange dot + "Syncing..." during active sync
   - Red dot + "Offline -- your check-ins are saved locally" when disconnected
   - Red dot + count: "3 pending syncs" when there are queued items

2. **Check-in button behavior:**
   - Online: "Clock In" (normal)
   - Offline: "Clock In (Offline)" with a subtle icon change
   - Both should feel the same -- instant success feedback

3. **After sync completes:**
   - Brief toast: "3 check-ins synced successfully"
   - If errors: "2 synced, 1 needs review" with tap to see details

---

## 5. Timestamp Integrity & Anti-Fraud

### 5.1 The Problem

Workers (or more likely, supervisors doing bulk check-ins) could manipulate their device clock to fake timestamps. In an offline scenario, we cannot verify the time server-side at the moment of check-in.

### 5.2 Multi-Layer Defense Strategy

**Layer 1: Device Time Offset Detection**

On every successful server communication, store the difference between device time and server time:

```typescript
// After any successful API call:
const serverTime = new Date(response.headers.get('Date')).getTime()
const deviceTime = Date.now()
const offset = deviceTime - serverTime // positive = device ahead, negative = behind

// Store in IndexedDB
await db.put('app_state', { key: 'last_time_offset', value: offset, updated_at: new Date().toISOString() })
```

When recording a check-in offline, include this offset:
```typescript
const queueItem = {
  timestamp: new Date().toISOString(),
  device_time_offset: cachedOffset, // from last known server communication
  // ... other fields
}
```

The server can then calculate a "likely real time" = `device_timestamp - device_time_offset` and flag large discrepancies.

**Layer 2: Sequence Validation**

On the server, validate that:
- Clock-in time is before clock-out time
- There is no impossibly short gap (e.g., <1 minute between in and out)
- There is no impossibly long gap (e.g., >16 hours)
- Offline check-ins received after sync are within a reasonable window (e.g., within the last 72 hours)
- A single employee does not have overlapping check-in periods

**Layer 3: GPS Timestamp Correlation**

GPS readings include their own timestamp from satellite signals. Compare the GPS timestamp with the device timestamp. A large discrepancy (>5 minutes) indicates clock tampering.

**Layer 4: Flagging, Not Blocking**

**Never silently reject an attendance record.** Always accept it and flag anomalies for HR review:

| Anomaly | Flag Level | Action |
|---------|-----------|--------|
| Device clock offset > 15 min | Warning | HR notification |
| Check-in outside geofence | Warning | HR notification |
| GPS unavailable | Info | Visible in reports |
| Offline check-in > 24h old on sync | Warning | HR review required |
| Duplicate check-in (same employee, <5 min gap) | Auto-resolve | Keep first, discard duplicate |

### 5.3 What We Intentionally Do NOT Do in v1

- **NTP enforcement** -- we cannot force the device to sync its clock
- **Biometric verification** -- explicitly out of scope for demo
- **Tamper-proof hardware** -- this is a web app, not a kiosk
- **Root/jailbreak detection** -- not reliable from a web context

These are appropriate for v2 or a native app phase.

---

## 6. Photo Capture for Verification

**Note:** Photo capture is listed as v2 (ADV-02) but worth documenting the architecture now because it affects IndexedDB schema design.

### 6.1 Camera Access in PWAs

**Confidence: HIGH** -- `getUserMedia` is universally supported in modern browsers

Two approaches available:

**Approach A: HTML file input (simpler, recommended for v2)**
```html
<input type="file" accept="image/*" capture="user" />
```
- `capture="user"` opens front camera (selfie)
- `capture="environment"` opens rear camera
- Works on all mobile browsers
- Returns a File object that can be stored as Blob in IndexedDB

**Approach B: MediaStream API (more control)**
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'user', width: 640, height: 480 }
})
// Render to <video>, capture frame to <canvas>, export as Blob
```
- More control over resolution, camera selection
- Can overlay UI elements (frame, instructions)
- Requires more code

### 6.2 Offline Storage of Photos

Photos captured offline should be stored as Blobs in IndexedDB alongside the queue item:

- Capture at 640x480 JPEG quality 0.7 -- approximately 30-80KB per photo
- IndexedDB can handle hundreds of these without issue
- On sync, upload as `multipart/form-data` or base64 in JSON
- After successful upload + server confirmation, delete local blob
- If on a slow connection (detected via Network Information API), defer photo upload and sync text data first

### 6.3 Photo Integrity

To prevent uploading pre-taken photos:
- Embed capture timestamp in EXIF-equivalent metadata
- Server compares photo capture time vs check-in time (should be within seconds)
- Store photo hash in the queue item to detect swaps
- v2+: Server-side face matching against employee profile photo

---

## 7. Recommended Architecture

### 7.1 System Overview

```
+-----------------------------------+
|        Mobile Browser (PWA)        |
|                                    |
|  +----------+  +---------------+   |
|  | React UI |  | Service Worker|   |
|  |          |  | (Serwist)     |   |
|  +----+-----+  +-------+-------+   |
|       |                |            |
|  +----v----------------v--------+  |
|  |          idb (IndexedDB)     |  |
|  |  +-----------+ +----------+  |  |
|  |  | sync_queue| | app_state|  |  |
|  |  +-----------+ +----------+  |  |
|  +------------------------------+  |
+----------------+------------------+
                 |
                 | (when online)
                 v
+----------------+------------------+
|        Supabase Backend            |
|                                    |
|  +------------+  +-------------+  |
|  | Edge Func  |  | Postgres DB |  |
|  | /api/sync  |  | + RLS       |  |
|  +------+-----+  +------+------+  |
|         |               |          |
|  +------v---------------v------+  |
|  |    Attendance Records       |  |
|  |    (validated, canonical)   |  |
|  +-----------------------------+  |
|                                    |
|  +-----------------------------+  |
|  |    Supabase Realtime        |  |
|  |    (dashboard updates)      |  |
|  +-----------------------------+  |
+-----------------------------------+
```

### 7.2 Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **PWA Shell** | UI rendering, user interaction, GPS capture | Next.js 16, React 19, Serwist |
| **Sync Engine** | Queue management, retry logic, conflict handling | Custom TypeScript module + `idb` |
| **Geofence Validator** | Client-side distance calculation | Haversine formula (pure TS) |
| **Connectivity Monitor** | Online/offline detection, network quality | Custom hook using navigator.onLine + ping + Network Info API |
| **Sync API** | Receive queue items, validate, persist | Supabase Edge Functions |
| **Attendance DB** | Canonical attendance records, RLS policies | Supabase Postgres |
| **Dashboard Realtime** | Push attendance updates to HR/supervisor screens | Supabase Realtime subscriptions |

### 7.3 Data Flow: Check-In (Offline)

```
1. Employee taps "Clock In"
2. App requests GPS (getCurrentPosition, enableHighAccuracy: true)
3. GPS returns {lat, lng, accuracy}
4. App reads cached location geofences from IndexedDB app_state
5. App runs Haversine check: is employee within assigned location's radius?
6. App creates QueueItem with all data + device_time_offset
7. App writes QueueItem to IndexedDB sync_queue
8. App shows success UI: "Checked in at [Location Name] (offline)"
9. App attempts sync -- fails (no connectivity)
10. QueueItem stays in IndexedDB
```

**Data Flow: Sync (When Online)**

```
1. Connectivity detected (online event / app focus / Background Sync)
2. Sync engine reads all items from sync_queue (ordered by created_at)
3. For each batch (up to 50 items):
   a. POST to /api/sync with array of QueueItems
   b. Server validates each item:
      - Check UUID doesn't already exist (idempotency)
      - Validate employee_id exists
      - Re-validate geofence server-side (GPS vs location coords)
      - Check device_time_offset for anomalies
      - Flag any issues (outside geofence, suspicious timing, etc.)
   c. Server responds with {synced: [...ids], errors: [...]}
4. For synced items: delete from IndexedDB sync_queue
5. For errors: increment retry_count, log last_error
6. After 5 retries: flag for manual review, stop retrying
7. Refresh cached reference data (locations, employees) from server
```

### 7.4 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| IndexedDB wrapper | `idb` | Minimal, promise-based, ~1KB. No need for reactive queries or ORM. |
| Sync strategy | Custom queue | Unidirectional data flow. PowerSync/RxDB add complexity for bidirectional sync we don't need. |
| Conflict resolution | Server-timestamp-wins + UUID idempotency | Attendance records are append-only events, not collaborative documents. |
| Geofence validation | Client + server | Client for instant UX feedback. Server for tamper-proof validation. |
| Photo storage | IndexedDB Blob | Stays with the queue item. Synced together or deferred on slow connections. |
| Caching | Serwist (Workbox-based) | Officially recommended by Next.js. Handles precaching + runtime caching. |

---

## 8. Critical Pitfalls

### Pitfall 1: Safari IndexedDB Eviction (CRITICAL)

**What goes wrong:** Safari on iOS can evict IndexedDB data after 7 days of inactivity if the app is not installed as a PWA (just visited as a website). This would delete pending sync items.

**Prevention:**
- **The app MUST be installed as a PWA** (Add to Home Screen). Installed PWAs get persistent storage.
- Call `navigator.storage.persist()` to request persistent storage
- Show prominent "Install App" prompts for iOS users
- On every app load, check sync queue size and warn if items are piling up
- Consider `navigator.storage.estimate()` to monitor storage usage

### Pitfall 2: Service Worker Update Stale Clients (CRITICAL)

**What goes wrong:** After deploying a new version, some workers may be running the old service worker for days. The old SW might cache stale API responses or miss new sync queue fields.

**Prevention:**
- Use `skipWaiting: true` and `clientsClaim: true` in Serwist config
- Show an "Update available" banner when a new SW is detected
- Version the IndexedDB schema -- handle migrations in the `upgrade` callback
- Version the sync API endpoint -- server should accept both old and new queue item formats during transition

### Pitfall 3: GPS Cold Start Delay (MODERATE)

**What goes wrong:** First GPS request after device boot or long idle can take 10-30 seconds. Workers tap "Clock In" and wait, confused.

**Prevention:**
- Start GPS request as soon as the check-in screen loads (not on button tap)
- Show a "Getting your location..." indicator
- Cache the last known position -- use `maximumAge: 60000` for a 1-minute cache
- If GPS takes >10s, show option to "Check in without GPS" (flagged for review)

### Pitfall 4: Turbopack vs Webpack Build Confusion (MODERATE)

**What goes wrong:** Developer runs `next build` (which uses Turbopack by default in Next.js 16), Serwist doesn't generate the service worker, and the production build has no offline support.

**Prevention:**
- Build script MUST be `next build --webpack`
- Add a post-build check that verifies `public/sw.js` exists
- Document this clearly in the project README
- Add a CI check that the SW file is present in the build output

### Pitfall 5: navigator.onLine False Positives (MODERATE)

**What goes wrong:** App thinks it's online (captive portal, WiFi with no internet), tries to sync, fails silently or hangs.

**Prevention:**
- Never trust `navigator.onLine === true` alone
- Always use the ping-based connectivity check before syncing
- Set aggressive timeouts on sync requests (10 seconds)
- Implement exponential backoff on sync failures

### Pitfall 6: IndexedDB Transaction Auto-Commit (MODERATE)

**What goes wrong:** IndexedDB transactions auto-commit when they go idle (no pending requests). An `await` on a non-IDB operation inside a transaction will cause it to auto-commit, leaving data in an inconsistent state.

**Prevention:**
- Keep IndexedDB transactions short and focused
- Do all async work (GPS, photo capture) BEFORE opening the transaction
- Use the `idb` library's `.done` promise to confirm transaction completion
- Structure code as: gather data -> open transaction -> write -> close

### Pitfall 7: Batch Sync Payload Size (MINOR)

**What goes wrong:** If a worker is offline for days and accumulates hundreds of entries (especially with photos), the sync payload is too large and times out.

**Prevention:**
- Sync in batches of 50 text records at a time
- Upload photos separately, linked by queue item UUID
- Defer photo uploads when on slow connections
- Show progress: "Syncing 3 of 47 records..."

### Pitfall 8: Clock Manipulation on Supervisor Devices (MINOR)

**What goes wrong:** A supervisor changes their device clock to backdate bulk check-ins.

**Prevention:**
- Track device_time_offset from last server sync
- Flag any queue items where offset changed significantly between creation
- Server-side: compare the "received at" time with the claimed timestamp
- Audit trail: log which device submitted each record

---

## 9. Saudi Market Context

### 9.1 How Competitors Handle Offline Attendance

Based on research of Saudi-market attendance solutions:

| App | Offline Approach | GPS | Key Feature |
|-----|-----------------|-----|-------------|
| **Where's My Staff** | Local storage + auto-sync | Geofencing (up to 3000 employees) | Background sync on reconnect |
| **Truein** | Face + GPS verified offline entries | Geofencing | Facial recognition even offline |
| **Ojoor** | GPS + mobile attendance | GPS tracking | Single dashboard for all locations |
| **CreativeTime** | Offline punch support | GPS | Saudi labor law compliance |

### 9.2 Saudi-Specific Considerations

- **Ramadan working hours** -- shift templates should support seasonal variations
- **Extreme heat** -- workers may be indoors/underground. GPS accuracy may vary in factory/tunnel settings.
- **Language** -- While v1 is English-only, the multinational workforce (Pakistani, Bangladeshi, Egyptian, Jordanian, Saudi) means UI must be simple and icon-heavy
- **Device quality** -- Expect lower-end Android phones. PWA must be lightweight.
- **Mudad/GOSI compliance** -- Not needed for v1 demo but v2 should export attendance in a format compatible with WPS (Wage Protection System) via Mudad

### 9.3 Competitive Advantage for Kunoz

The demo must show what off-the-shelf solutions cannot:
1. **Custom to their locations** -- pre-seeded with their actual 8 sites and 70 employees
2. **No app store friction** -- PWA installs from browser, no Google Play needed
3. **Real-time HR dashboard** -- supervisors and HR see live updates, not end-of-day reports
4. **Transparent offline handling** -- clear UI showing what is synced vs pending
5. **No per-employee SaaS fees** -- this is their own system, not a monthly subscription per head

---

## 10. Technology Summary

### Required Packages

```bash
# PWA / Service Worker
npm i @serwist/next
npm i -D serwist

# IndexedDB
npm i idb

# Push Notifications (v1 or v2)
npm i web-push  # server-side only

# No additional packages needed for:
# - Geolocation (built-in browser API)
# - Camera access (built-in browser API)
# - Geofence calculation (custom Haversine, ~10 lines)
# - Connectivity detection (custom, ~20 lines)
# - Sync queue (custom, built on idb)
```

### Browser Compatibility Matrix

| Feature | Chrome Android | Samsung Internet | Safari iOS (PWA) | Firefox Android |
|---------|---------------|-----------------|-----------------|----------------|
| Service Worker | YES | YES | YES | YES |
| IndexedDB | YES | YES | YES (persistent when installed) | YES |
| Geolocation | YES | YES | YES | YES |
| getUserMedia (camera) | YES | YES | YES | YES |
| Background Sync | YES | YES | NO | NO |
| Network Info API | YES | YES | NO | NO |
| Web Push | YES | YES | YES (16.4+) | YES |
| Install prompt | YES (auto) | YES (auto) | NO (manual) | NO |

---

## Sources

### Official Documentation
- [Next.js PWA Guide (v16.2.1, updated 2026-03-25)](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Serwist Getting Started with Next.js](https://serwist.pages.dev/docs/next/getting-started)
- [Serwist Runtime Caching](https://serwist.pages.dev/docs/serwist/runtime-caching)
- [MDN: Background Synchronization API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [MDN: Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
- [MDN: Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
- [MDN: MediaStream Image Capture API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Image_Capture_API)
- [Can I Use: Background Sync](https://caniuse.com/background-sync)

### Libraries
- [idb -- IndexedDB with promises (Jake Archibald)](https://github.com/jakearchibald/idb)
- [Serwist GitHub](https://github.com/serwist/serwist)
- [Dexie.js (evaluated, not recommended)](https://dexie.org/)
- [PowerSync (evaluated, not recommended for this use case)](https://www.powersync.com)
- [RxDB Supabase Replication (evaluated, not recommended)](https://rxdb.info/replication-supabase.html)
- [haversine-distance npm](https://www.npmjs.com/package/haversine-distance)

### Architecture & Patterns
- [LogRocket: Offline-first frontend apps in 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [LogRocket: Build a Next.js 16 PWA with offline support](https://blog.logrocket.com/nextjs-16-pwa-offline-support/)
- [Building Offline Apps with Next.js and Serwist](https://sukechris.medium.com/building-offline-apps-with-next-js-and-serwist-a395ed4ae6ba)
- [Using IndexedDB for Offline-First Web Applications](https://dev.to/hexshift/using-indexeddb-for-offline-first-web-applications-33o0)
- [Offline-First with IndexedDB and Sync: A Real-World Guide](https://medium.com/@sohail_saifii/implementing-offline-first-with-indexeddb-and-sync-a-real-world-guide-0638c8d01056)
- [Advanced PWA Playbook: Offline, Push & Background Sync](https://rishikc.com/articles/advanced-pwa-features-offline-push-background-sync/)
- [Haversine Formula Reference (Movable Type)](https://www.movable-type.co.uk/scripts/latlong.html)

### Supabase Offline
- [Supabase Discussion: Using Supabase offline](https://github.com/orgs/supabase/discussions/357)
- [PowerSync + Supabase Integration](https://www.powersync.com/blog/bringing-offline-first-to-supabase)
- [PowerSync JS Web SDK](https://docs.powersync.com/client-sdks/reference/javascript-web)

### Geolocation & Geofencing
- [Progressier: Geolocation API in PWAs](https://progressier.com/pwa-capabilities/geolocation)
- [Progressier: Geofencing API (not available)](https://progressier.com/pwa-capabilities/geofencing)
- [web.dev PWA Capabilities](https://web.dev/learn/pwa/capabilities)

### Camera & Photo Capture
- [How to Access the Camera in a PWA (2025)](https://simicart.com/blog/pwa-camera-access/)
- [DZone: Progressive Selfies Web App](https://dzone.com/articles/how-to-build-a-progressive-selfies-web-app)
- [Building an Offline PWA Camera App with React](https://dev.to/ore/building-an-offline-pwa-camera-app-with-react-and-cloudinary-5b9k)

### Timestamp Integrity & Anti-Fraud
- [FareClock: Detecting time tampering in attendance systems](https://www.fareclock.com/detecting-time-tampering-in-employee-attendance-systems-techniques-and-technologies/)
- [OpenTimeClock: Offline clock-in and data reconciliation](https://www.opentimeclock.com/docs/blog1/november-2025/what-managers-must-know-about-offline-clock-in-and-data-reconciliation)
- [OpenTimeClock: Preventing GPS spoofing](https://www.opentimeclock.com/docs/blog1/january-2026/how-to-prevent-gps-spoofing-on-mobile-time-clocks-using-practical-steps.)

### Conflict Resolution
- [TypeScript CRDT Toolkits (evaluated, not needed)](https://medium.com/@2nick2patel2/typescript-crdt-toolkits-for-offline-first-apps-conflict-free-sync-without-tears-df456c7a169b)
- [The CRDT Dictionary](https://www.iankduncan.com/engineering/2025-11-27-crdt-dictionary/)
- [Offline and Thriving: Building Resilient Applications (InfoQ)](https://www.infoq.com/presentations/offline-first-apps/)

### Saudi Market
- [7 Best Employee GPS Tracking Apps in Saudi Arabia](https://whereismystaff.com/blog/7-best-employee-gps-tracking-apps-in-saudi-arabia-in-depth-review/)
- [5 Best Time & Attendance Softwares in Saudi Arabia 2025](https://truein.com/gcc-blogs/best-time-attendance-softwares-saudi-arabia)
- [10 Best Time & Attendance Software in KSA (2026)](https://ensaantech.com/blog/best-time-attendance-software-in-saudi-arabia-ksa/)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| PWA / Serwist setup | HIGH | Official Next.js docs + Serwist docs verified |
| IndexedDB / idb | HIGH | Mature API, well-documented, universal browser support |
| Sync queue pattern | HIGH | Well-established pattern with multiple real-world references |
| Geolocation API | HIGH | Universal browser support, verified via MDN |
| Geofencing (client-side) | HIGH | Haversine formula is trivial and well-proven |
| Background Sync browser support | HIGH | Verified via CanIUse -- Chromium only |
| Safari IndexedDB eviction | HIGH | Documented behavior, PWA installation mitigates |
| Timestamp integrity approaches | MEDIUM | Based on industry patterns; exact GPS timestamp comparison needs testing |
| Photo capture offline | MEDIUM | getUserMedia is universal, but Blob-in-IndexedDB sync needs perf testing at scale |
| Turbopack/Webpack caveat | HIGH | Verified in official Serwist docs |

---

*Research completed: 2026-03-31*
*Researcher: Claude Opus 4.6*
