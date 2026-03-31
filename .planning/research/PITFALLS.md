# Domain Pitfalls

**Domain:** Workforce Attendance & Time Tracking (Construction/Manufacturing)
**Researched:** 2026-03-31

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: GPS Spoofing / Location Fraud
**What goes wrong:** Workers use GPS spoofing apps (widely available on Android) to fake their location and clock in from home.
**Why it happens:** Construction workers quickly discover spoofing if the system relies solely on GPS.
**Consequences:** Entire attendance data becomes unreliable. System loses management trust.
**Prevention:**
- Layer verification: GPS + supervisor confirmation for high-risk cases
- Server-side anomaly detection: flag records where GPS accuracy is suspiciously high (exactly 0.0 meters), coordinates are identical across multiple days, or location jumps are physically impossible (e.g., 100km in 5 minutes)
- Optional photo capture at clock-in (stored in Supabase Storage)
- Supervisor batch clock-in for sites where trust is low
**Detection:** Dashboard flag for suspicious patterns. Weekly anomaly report.

### Pitfall 2: Offline Sync Data Loss
**What goes wrong:** Workers clock in offline, but data never syncs because they close the browser, clear cache, or switch devices.
**Why it happens:** IndexedDB is per-origin, per-browser. Service workers can be unregistered. Background Sync is not guaranteed.
**Consequences:** Missing attendance records. Workers claim they clocked in but no record exists. Disputes.
**Prevention:**
- Show clear sync status indicators: green (synced), yellow (pending), red (failed)
- Implement retry with exponential backoff (not just Background Sync)
- Add `online` event listener as fallback for browsers without Background Sync (Safari, Firefox)
- Keep a local log of all sync attempts for dispute resolution
- Supervisor daily review: dashboard shows "X records pending sync" per location
**Detection:** Admin dashboard showing unsynced record count per location. Alert if records are unsynced for > 24 hours.

### Pitfall 3: Building a Full HR Suite Instead of an Attendance System
**What goes wrong:** Scope creeps into leave management, payroll, performance reviews, training tracking, expense management...
**Why it happens:** Client says "while you're at it, can you also add..." Feature requests are individually reasonable but collectively overwhelming.
**Consequences:** Demo never ships. Core attendance features are half-built. Project stalls.
**Prevention:**
- Hard scope boundary: attendance tracking + reporting + basic shift management
- "Export to Excel" is the integration strategy for Phase 1 -- HR team processes data in their existing tools
- Maintain a "Future Features" list but do not build anything on it for demo
- Every new feature request gets the question: "Does this help track who showed up to work today?"
**Detection:** If building something unrelated to clock-in/out, stop and reassess.

### Pitfall 4: Timezone and Date Handling Errors
**What goes wrong:** Overtime is miscalculated because timestamps are stored in local time, or date boundaries are computed incorrectly.
**Why it happens:** Saudi Arabia is UTC+3 with no DST, which seems simple. But mixing `new Date()` (local), `toISOString()` (UTC), and database TIMESTAMPTZ creates subtle bugs.
**Consequences:** Workers are over/underpaid for overtime. Legal liability under Saudi labor law.
**Prevention:**
- All timestamps stored as UTC (TIMESTAMPTZ in Postgres)
- All client-side dates created with explicit timezone: `new Date().toISOString()` only
- Display layer converts to `Asia/Riyadh` using `date-fns-tz`
- "Day" boundary for attendance is midnight Riyadh time (21:00 UTC), not midnight UTC
- Write unit tests for overtime calculation across day boundaries
**Detection:** Compare manual overtime calculation against system output for a sample week.

### Pitfall 5: Saudi Labor Law Non-Compliance
**What goes wrong:** System doesn't correctly implement overtime rules, Ramadan hours, break requirements, or record retention.
**Why it happens:** Developer assumes standard 8-hour rules apply universally. Doesn't account for Ramadan, hazardous work reductions, or the 2025 law amendments.
**Consequences:** Legal penalties. Fines. Business operation restrictions. Saudi law now requires 5-year digital record retention.
**Prevention:**
- Encode these rules explicitly:
  - 8h/day or 48h/week maximum (Article 98)
  - 6h/day or 36h/week during Ramadan for Muslim employees (Article 98)
  - 30-minute break after 5 consecutive hours (not counted as working time)
  - Overtime paid at basic hourly rate + 50% (150% total) (Article 107)
  - Maximum 11 hours/day including overtime (Article 101)
  - No more than 6 consecutive working days without rest
  - Public holidays (Eid Al-Fitr 4 days, Eid Al-Adha 4 days, National Day) are overtime if worked
  - Records must be retained digitally for 5 years (2025 amendment)
- Make rules configurable (settings table), not hardcoded
- Add a `labor_law_version` field to settings for future amendments
**Detection:** Run compliance audit query: any records exceeding 11h/day or 48h/week without overtime flagging.

## Moderate Pitfalls

### Pitfall 6: Geolocation API Permissions Denied
**What goes wrong:** Workers deny location permission on their phone, or the browser never prompts.
**Why it happens:** Privacy-conscious workers, or Android settings blocking location for the browser.
**Prevention:**
- Clear onboarding explaining why GPS is needed ("to verify you're at the work site")
- Fallback: supervisor batch clock-in if GPS unavailable
- Never let GPS denial silently fail -- show explicit error with instructions
- Test on Chrome, Safari, Samsung Internet, and Android WebView

### Pitfall 7: Poor GPS Accuracy at Construction Sites
**What goes wrong:** GPS reports accuracy of 50-100+ meters, especially near tall buildings or inside warehouses.
**Why it happens:** Urban canyon effect in cities like Riyadh. Indoor GPS is unreliable.
**Prevention:**
- Set generous geofence radius (200m default, configurable per site)
- Store GPS accuracy value with every record
- Accept clock-in if accuracy < geofence radius (don't require pinpoint precision)
- For indoor sites: consider WiFi-based location or simply use supervisor clock-in

### Pitfall 8: Service Worker Cache Staleness
**What goes wrong:** Workers see old version of the app because service worker serves cached assets.
**Why it happens:** Cache-first strategy means updates aren't picked up until service worker updates.
**Prevention:**
- Implement `skipWaiting()` + `clients.claim()` for immediate activation
- Show "New version available - tap to update" banner
- Version the app shell; service worker detects mismatch and triggers update
- Cache-bust API requests (never cache POST/PUT operations)

### Pitfall 9: Buddy Punching via Shared Devices
**What goes wrong:** One worker clocks in for another using a shared tablet in kiosk mode.
**Why it happens:** QR code kiosk is convenient but codes can be shared or photographed.
**Prevention:**
- Combine QR scan with photo capture (camera takes photo at scan time)
- Supervisor reviews photo log daily
- Rate-limit: same device cannot clock in two different people within 30 seconds
- Consider rotating QR codes (time-based, like TOTP) for higher security

### Pitfall 10: Demo Data That Doesn't Tell a Story
**What goes wrong:** Demo shows empty tables or random data. Client can't envision their company using it.
**Why it happens:** Developer focuses on features, not demo experience.
**Prevention:**
- Seed database with realistic data matching Kunoz's actual locations and employee structure
- Use the Excel file data (locations and employees) as seed source
- Pre-populate 2 weeks of attendance with realistic patterns (latecomers, overtime, absences)
- Create a guided demo walkthrough script

## Minor Pitfalls

### Pitfall 11: Mobile Keyboard Obscuring Clock-In Button
**What goes wrong:** On mobile, virtual keyboard pushes the clock-in button off-screen.
**Prevention:** Clock-in screen should have minimal input fields. Large button, no text input required for basic clock-in.

### Pitfall 12: Battery Drain Concerns
**What goes wrong:** Workers complain the app drains their battery because of GPS.
**Prevention:** Only request GPS at clock-in/out moment (not continuous tracking). Single `getCurrentPosition()` call, not `watchPosition()`.

### Pitfall 13: Excel Export Encoding Issues
**What goes wrong:** Arabic names or special characters appear garbled in exported Excel files.
**Prevention:** Use proper UTF-8 encoding with BOM in xlsx library. Test with Arabic employee names before demo.

### Pitfall 14: Supabase Free Tier Limits
**What goes wrong:** Running out of API requests or database size during development/demo.
**Prevention:** Supabase free tier: 500MB database, 50K monthly active users, 2GB bandwidth. More than enough for 70 employees. But be aware of Realtime connection limits (200 concurrent on free tier -- sufficient for demo).

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Foundation & Data Model | Schema doesn't account for offline sync fields | Include `client_created_at`, `synced_at`, `synced` flag from day one |
| Clock-In/Out Engine | GPS accuracy varies wildly by device/location | Test with actual devices at real coordinates. Use generous geofence. |
| Offline-First & PWA | Service worker breaks navigation in Next.js App Router | Use Serwist's Next.js integration, not manual SW registration. Test navigation patterns. |
| Shift & Saudi Compliance | Ramadan dates change yearly (Islamic calendar) | Don't hardcode dates. Use a toggle or date range setting. |
| Reporting & Dashboard | Reports are slow on large date ranges | Add indexes on (location_id, clock_in) and (employee_id, clock_in). Paginate results. |
| Demo Prep | Client expects Arabic UI | Scope is English-only. Confirm this upfront. Ensure Arabic names display correctly in data. |

## Sources

- [GPS Spoofing Prevention in Time Tracking - Workyard](https://www.workyard.com/compare/biometric-time-clock)
- [Saudi Labor Law Working Hours 2026 - SafwaHR](https://safwahr.com/complete-guide-to-saudi-labor-law-working-hours-in-2026/)
- [Saudi Labour Law Updates 2025 - TASC](https://tascoutsourcing.sa/en/insights/saudi-labour-law-updates-2025)
- [Overtime Compliance Saudi Arabia - SmartHCM](https://smarthcm.cloud/overtime-compliance-in-saudi-arabia/)
- [Background Sync API Browser Support](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- [Offline-First PWA Caching Strategies](https://www.magicbell.com/blog/offline-first-pwas-service-worker-caching-strategies)
- [Multi-Site Construction Time Tracking - BDC Magazine](https://bdcmagazine.com/2026/02/multi-site-construction-time-tracking-what-works-when-youre-managing-10-job-sites/)
