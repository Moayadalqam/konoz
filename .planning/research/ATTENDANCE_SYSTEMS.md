# Attendance Systems Research: Kunoz Workforce Tracking

**Context:** Kunoz -- Saudi construction/manufacturing, ~70 employees, 8 locations (Riyadh, Mecca, Jeddah, etc.)
**Stack:** Next.js + Supabase | English only | Demo for client
**Researched:** 2026-03-31
**Confidence:** HIGH (multiple verified sources across all domains)

---

## 1. Clock-In/Out Best Practices for Blue-Collar Workforce

### Self Check-In vs Supervisor Check-In

**Industry standard: Hybrid approach.** Most construction-specific tools support both methods:

| Method | When to Use | Pros | Cons |
|--------|-------------|------|------|
| **Self check-in** (worker's phone) | Workers have smartphones, GPS-capable | Scalable, no bottleneck | Requires phone, GPS spoofing risk |
| **Supervisor check-in** (batch) | Workers without phones, high-trust sites | Eliminates device dependency | Supervisor becomes bottleneck, less accountable |
| **Kiosk / tablet at site** | Fixed entry points, factories, warehouses | Works for all workers | Requires hardware, single point of failure |

**Recommendation for Kunoz:** Default to self check-in with GPS verification. Add supervisor batch mode for workers without smartphones. Consider a tablet kiosk at factory sites with fixed entry points.

Sources:
- [TimeDock: Supervisor scans workers' QR codes on arrival](https://timedock.com/mobile) -- saves 4h/week per supervisor vs paper timecards
- [SmartBarrel: Biometric kiosk with cellular, no WiFi needed](https://smartbarrel.io/geofence-time-tracking-software/)
- [Workyard: Photo ID verification at clock-in](https://www.workyard.com/compare/construction-time-clock-apps)

### GPS Geofencing for Location Verification

GPS geofencing is the **industry standard** for construction attendance in 2025-2026.

**How it works:**
1. Define a virtual boundary (geofence) around each job site -- center point + radius
2. When a worker clocks in, the app captures their GPS coordinates
3. System checks if coordinates fall within the geofence using distance calculation
4. Clock-in is accepted only if within boundary

**Key implementation details:**
- **Geofence radius:** 50-1,500 meters configurable. Default 200m for construction sites (accounts for GPS drift).
- **Geofence shape:** Circular is sufficient for most sites. Polygonal needed only for irregular large sites.
- **GPS accuracy:** Store the accuracy value with every record. Accept if accuracy < geofence radius.
- **Battery impact:** Less than 10KB data per clock-in. No continuous tracking -- single `getCurrentPosition()` call.
- **Automatic clock-in:** Some systems auto-clock when entering geofence. NOT recommended for Kunoz -- explicit action is better for audit trail.

**Server-side validation (critical):** Client-side geofence check provides instant UX feedback, but server must re-validate on sync to prevent GPS spoofing. Flag records where:
- GPS accuracy is exactly 0.0 (spoofed)
- Coordinates are identical across multiple days (copy-pasted)
- Location jumps exceed physical possibility

**Supabase implementation:** Use PostGIS extension with `ST_DWithin` function:
```sql
-- Check if worker is within geofence
SELECT ST_DWithin(
  ST_MakePoint(worker_lng, worker_lat)::geography,
  geofence_center,
  geofence_radius_meters
) FROM locations WHERE id = 'location-uuid';
```

Sources:
- [Hubstaff Geofence Time Tracking](https://hubstaff.com/geofence-time-tracking)
- [hh2: Geofencing for Construction](https://www.hh2.com/construction-management/geofencing-for-construction-the-future-of-employee-time-tracking)
- [American Payroll Association: 75% of companies experience time theft losses](https://hubstaff.com/geofence-time-tracking)

### QR Code, NFC, Biometric Approaches

| Method | Hardware Needed | Buddy-Punch Risk | Offline Capable | Best For |
|--------|----------------|-------------------|-----------------|----------|
| **QR Code (personal)** | Worker's phone OR shared tablet | Medium (codes can be shared) | Yes | Quick implementation, low cost |
| **QR Code (supervisor scan)** | Supervisor's phone | Low (supervisor verifies visually) | Yes | Workers without phones |
| **NFC badge** | NFC reader + badges | Low (badge is physical) | Yes | Factory fixed entry points |
| **Fingerprint** | Biometric scanner hardware | None | Yes (device stores locally) | High-security sites |
| **Facial recognition** | Camera (phone or kiosk) | None | Partial (needs model locally) | Fraud prevention |
| **PIN code** | Any device with keypad | High (PINs easily shared) | Yes | Fallback only |

**Recommendation for Kunoz MVP:**
1. **Primary:** GPS-verified self clock-in (phone app)
2. **Secondary:** Supervisor batch clock-in (for workers without phones)
3. **Future:** QR code kiosk at factory sites (shared tablet at entrance)

Do NOT invest in NFC or biometric hardware for the demo. These are Phase 2+ considerations if the client specifically requests them.

Sources:
- [Calamari KIOSK: NFC + QR + Face](https://www.calamari.io/attendance-tracking/kiosk)
- [OLOID: Tablet-based face/QR/NFC with offline operation](https://www.oloid.com/platform/timeclock)
- [Workyard: Biometric alternatives for construction](https://www.workyard.com/compare/biometric-time-clock)

### Handling Workers Without Smartphones

This is a real concern in blue-collar construction. Options ranked by practicality:

1. **Supervisor batch clock-in (RECOMMENDED):** Supervisor selects crew members from a list, submits one GPS-verified batch. Workers don't need any device.
2. **Shared tablet/kiosk at site entrance:** Workers scan personal QR badge or enter employee number. Tablet stays on-site.
3. **SMS-based clock-in:** Worker texts a number (e.g., "IN" to a Twilio number). Deputy and TeamSense use this model. Requires basic phone only.
4. **NFC badge tap:** Worker taps badge at NFC reader. Requires hardware at each site.
5. **Call-in IVR:** Worker calls a number, enters employee number via keypad. Lowest tech requirement.

**For Kunoz MVP:** Supervisor batch clock-in covers this use case with zero additional cost or complexity. SMS fallback can be added later if needed.

Sources:
- [Yourco: SMS vs Mobile Apps for Frontline Workers](https://www.yourco.io/blog/sms-vs-mobile-apps-frontline-workers)
- [Deputy via Twilio: SMS clock-in](https://customers.twilio.com/en-us/deputy)
- [TeamSense: Text-based attendance, no app required](https://www.teamsense.com/)

---

## 2. Offline-First Patterns for Unreliable Internet

### Architecture: PWA with Service Workers

The recommended architecture for Next.js + Supabase offline-first is well-established in 2026:

```
User Action (Clock-In)
        |
        v
+------------------+
| IndexedDB        |  <-- LOCAL SOURCE OF TRUTH
| (via idb library)|      Always write here first
+--------+---------+
         |
         | Immediate
         v
+------------------+
| Optimistic UI    |  <-- Show success instantly
| (React state)    |
+--------+---------+
         |
         | If online: try immediate sync
         | If offline: register Background Sync
         v
+------------------+
| Sync Queue       |  <-- Stored in IndexedDB
| (pending items)  |      Each item: id, operation, payload, timestamp, retryCount
+--------+---------+
         |
         | Background Sync event OR online event
         v
+------------------+
| Supabase REST    |  <-- Server reconciliation
| (attendance API) |
+--------+---------+
         |
         | On success: mark as synced in IndexedDB
         | On conflict: last-write-wins by client_created_at
         v
+------------------+
| IndexedDB Update |  <-- synced: true
+------------------+
```

**Key libraries:**
- **Serwist** (v9.x): Next.js-native service worker toolkit. Successor to next-pwa. Handles asset caching, manifest generation.
- **idb** (v8.x): Lightweight IndexedDB wrapper with Promise-based API. ~1.2KB gzipped.
- **Background Sync API**: Browser standard for deferred network requests. Chromium-only in 2026.

Sources:
- [LogRocket: Next.js 16 PWA with offline support (Jan 2026)](https://blog.logrocket.com/nextjs-16-pwa-offline-support/)
- [Medium: Offline-First PWA with Next.js + IndexedDB + Supabase (Jan 2026)](https://oluwadaprof.medium.com/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9)

### Local Storage Sync Strategies

**IndexedDB schema for offline attendance:**

```typescript
// Using idb library
import { openDB, DBSchema } from 'idb';

interface KunozDB extends DBSchema {
  attendance: {
    key: string; // UUID
    value: {
      id: string;
      employee_id: string;
      location_id: string;
      clock_in: string; // ISO 8601 UTC
      clock_out: string | null;
      clock_in_lat: number;
      clock_in_lng: number;
      clock_in_method: string;
      client_created_at: string;
      synced: boolean;
      sync_attempts: number;
      last_sync_error: string | null;
    };
    indexes: {
      'by-synced': boolean;
      'by-employee': string;
      'by-date': string;
    };
  };
  sync_queue: {
    key: number; // auto-increment
    value: {
      id: number;
      operation: 'create' | 'update';
      table: string;
      payload: Record<string, unknown>;
      created_at: string;
      retry_count: number;
      max_retries: number;
    };
  };
  cached_data: {
    key: string;
    value: {
      key: string;
      data: unknown;
      cached_at: string;
    };
  };
}

const db = await openDB<KunozDB>('kunoz-db', 1, {
  upgrade(db) {
    const attendance = db.createObjectStore('attendance', { keyPath: 'id' });
    attendance.createIndex('by-synced', 'synced');
    attendance.createIndex('by-employee', 'employee_id');
    attendance.createIndex('by-date', 'client_created_at');

    db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
    db.createObjectStore('cached_data', { keyPath: 'key' });
  }
});
```

**What to cache for offline operation:**
- Employee list (for supervisor batch clock-in)
- Location data with geofence coordinates (for client-side validation)
- Current shift definitions
- Today's existing attendance records (to prevent double clock-in)

**Cache refresh strategy:**
- On app load (if online): fetch fresh data, update IndexedDB
- Stale threshold: 24 hours. If cached data is older, show warning but still allow offline operation.

### Conflict Resolution When Syncing

**Strategy: Last-Write-Wins (LWW) by `client_created_at`**

For attendance data, LWW is sufficient because:
- Each attendance record is "owned" by one employee
- Concurrent edits to the same record are rare
- When they do happen (e.g., supervisor corrects while worker clocks out), the later timestamp should win

```typescript
async function syncToSupabase(record: AttendanceRecord): Promise<boolean> {
  const { data: existing } = await supabase
    .from('attendance_records')
    .select('client_created_at')
    .eq('id', record.id)
    .single();

  if (existing && existing.client_created_at > record.client_created_at) {
    // Server has newer version -- don't overwrite
    // Pull server version to local
    return false;
  }

  // Our version is newer or record doesn't exist -- push
  const { error } = await supabase
    .from('attendance_records')
    .upsert(record, { onConflict: 'id' });

  return !error;
}
```

**Edge cases handled:**
- **Double clock-in:** Client checks IndexedDB for existing clock-in today before allowing new one
- **Clock-out without clock-in:** Rejected client-side. If found on server, flag for manual review.
- **Time drift between devices:** Use `client_created_at` (device time) + `server_received_at` (server time). If drift > 5 minutes, flag record.

### SMS Fallback Approaches

For sites with truly no internet (and no WiFi):

**Option 1: Twilio SMS Integration**
- Worker texts "IN [employee_number]" to a Twilio number
- Supabase Edge Function receives webhook, creates attendance record
- System texts back confirmation: "Clocked in at 7:02 AM, Site: Riyadh-1"
- Cost: ~$0.01-0.05 per SMS (Twilio pricing)

**Option 2: WhatsApp Business API**
- Similar to SMS but over WhatsApp (more common in Saudi Arabia than SMS)
- Worker sends "IN" to business WhatsApp number
- Lower cost than SMS, richer confirmation (can include location request)

**Recommendation for Kunoz:** NOT for MVP. Offline-first PWA with sync handles 99% of cases. SMS/WhatsApp is a Phase 3 nice-to-have for truly remote sites.

Sources:
- [Deputy + Twilio SMS Integration](https://customers.twilio.com/en-us/deputy)
- [MyTeamSafe: SMS Fallback](https://content.myteamsafe.com/sms-fallback-no-internet/)
- [Offline-First PWA Caching Strategies](https://www.magicbell.com/blog/offline-first-pwas-service-worker-caching-strategies)

---

## 3. HR Reporting Best Practices

### Standard Reports

| Report | Frequency | Key Data | Format |
|--------|-----------|----------|--------|
| **Daily Attendance Summary** | Daily | Present/absent/late counts per location | Dashboard + Excel |
| **Individual Attendance Log** | On demand | Full clock-in/out history for one employee | Table + Excel |
| **Overtime Report** | Weekly/Monthly | Overtime hours per employee, total cost impact | Excel + PDF |
| **Absence Report** | Weekly | Absent employees, frequency, patterns | Dashboard + Excel |
| **Late Arrivals Report** | Daily | Workers who clocked in after shift start | Dashboard alert |
| **Early Departures Report** | Daily | Workers who clocked out before shift end | Dashboard alert |
| **Location Headcount** | Real-time | Current on-site workers per location | Live dashboard |
| **Monthly Summary** | Monthly | Total hours, overtime, absences per employee | Excel + PDF |

### Action Workflows

| Trigger | Action | Actor |
|---------|--------|-------|
| Worker clocks in late | Auto-flag as "late". Supervisor sees in dashboard. | System |
| Worker absent (no clock-in by shift start + grace period) | Alert supervisor. Record as absent. | System + Supervisor |
| Overtime threshold reached | Notify supervisor. Require approval for continued work. | System + Supervisor |
| Attendance correction requested | Goes to pending queue. Admin/supervisor approves or rejects. | Employee -> Admin |
| 3+ absences in a month | Generate warning notification for HR. | System -> Admin |
| Missing clock-out | Auto-close at shift end time. Flag for review. | System |

### Export Formats

| Format | When | Library |
|--------|------|---------|
| **Excel (.xlsx)** | Standard HR export. Payroll integration. | SheetJS (xlsx) |
| **PDF** | Formal reports, printing, archiving | jsPDF |
| **CSV** | Data import into other systems | Native JS |

### Dashboard KPIs

**Primary KPIs (always visible):**
1. **Today's attendance rate:** (present / expected) * 100. Target: >95%.
2. **On-site headcount:** Live count per location. Color-coded vs expected.
3. **Late arrivals today:** Count + names. Red if > 5% of workforce.
4. **Pending corrections:** Count of unresolved correction requests.
5. **Overtime this week:** Total hours across all employees.

**Secondary KPIs (drill-down):**
- Absence rate trend (last 30 days, by location)
- Average arrival time vs shift start (by location)
- Top 5 most absent employees (last 30 days)
- Overtime distribution by location
- Clock-in method breakdown (self vs supervisor vs kiosk)

**Dashboard design principles (from HR analytics best practices):**
- Limit to 7-10 KPIs per view. Don't overwhelm.
- Refresh: operational dashboard daily/real-time; strategic monthly.
- Color coding: green (good), yellow (attention), red (action needed).
- Drill-down capability: click a KPI to see underlying data.
- Stakeholder views: supervisor sees their location; admin sees all locations.

Sources:
- [HiBob: HR Dashboard Examples](https://www.hibob.com/blog/hr-dashboard-examples/)
- [ThoughtSpot: 12 HR Metrics to Track](https://www.thoughtspot.com/data-trends/dashboard/hr-metrics-kpis-examples)
- [HeartCount: HR Metrics That Drive Results 2025](https://heartcount.com/blog/hr-metrics/)
- [Zoho Analytics: HR Dashboard Best Practices](https://www.zoho.com/analytics/glossary/hr-dashboard.html)

---

## 4. Shift Management for Multi-Site Operations

### Fixed vs Flexible Shifts

**For construction/manufacturing (like Kunoz): Fixed shifts are standard.**

| Aspect | Fixed Shifts | Flexible Shifts |
|--------|-------------|-----------------|
| Definition | Set start/end times (e.g., 7:00-15:00) | Worker chooses within a window |
| Best for | Construction, factories, warehouses | Office workers, tech companies |
| Overtime calculation | Simple: hours beyond shift end | Complex: needs daily/weekly threshold tracking |
| Kunoz recommendation | **Use this** | Not appropriate for blue-collar workforce |

**Common construction shift patterns:**
- **5x8:** Mon-Fri, 8 hours/day (standard Saudi, aligns with 48h/week max with Sat optional)
- **6x8:** Mon-Sat, 8 hours/day (48h/week exactly -- Saudi maximum)
- **Ramadan:** 6h/day max for Muslim employees (typically 9:00-15:00 or similar)

**Implementation:**
```
shifts table:
- Morning Shift: 06:00 - 14:00 (8h, 30min break)
- Day Shift: 07:00 - 15:00 (8h, 30min break)
- Evening Shift: 14:00 - 22:00 (8h, 30min break)
- Ramadan Shift: 09:00 - 15:00 (6h, 30min break)
```

Assign employees to shifts via `employee_shifts` junction table with `effective_from` / `effective_to` dates.

### Overtime Calculation Rules (Saudi Labor Law)

**Article 98-107 of Saudi Labor Law (with 2025 amendments):**

```
DAILY OVERTIME:
- Standard: hours worked > 8h/day -> overtime
- Ramadan (Muslim employees): hours worked > 6h/day -> overtime
- Hazardous work: hours worked > 7h/day -> overtime

WEEKLY OVERTIME:
- Standard: hours worked > 48h/week -> overtime
- Ramadan: hours worked > 36h/week -> overtime

OVERTIME PAY:
- Rate = (basic hourly wage) + 50% of (basic hourly wage)
- Effectively: 150% of normal hourly rate
- OR: employer may offer 1.5 hours compensatory leave per 1 hour overtime (with written employee consent)

MAXIMUM:
- Total work day cannot exceed 11 hours (regular + overtime)
- Cannot work more than 6 consecutive days without a rest day

PUBLIC HOLIDAYS:
- All hours worked on public holidays are treated as overtime (paid at 150%)
- Eid Al-Fitr: 4 days
- Eid Al-Adha: 4 days
- National Day: 1 day
```

**Implementation approach:**
```typescript
interface OvertimeResult {
  regularMinutes: number;
  overtimeMinutes: number;
  isPublicHoliday: boolean;
  overtimeRate: number; // 1.5 for standard overtime
}

function calculateDailyOvertime(
  clockIn: Date,
  clockOut: Date,
  breakMinutes: number,
  isRamadan: boolean,
  isPublicHoliday: boolean
): OvertimeResult {
  const totalWorked = differenceInMinutes(clockOut, clockIn) - breakMinutes;
  const dailyLimit = isRamadan ? 360 : 480; // 6h or 8h in minutes
  const maxDaily = 660; // 11h in minutes (absolute maximum)

  const effectiveWorked = Math.min(totalWorked, maxDaily);

  if (isPublicHoliday) {
    return {
      regularMinutes: 0,
      overtimeMinutes: effectiveWorked, // ALL hours are overtime on holidays
      isPublicHoliday: true,
      overtimeRate: 1.5,
    };
  }

  return {
    regularMinutes: Math.min(effectiveWorked, dailyLimit),
    overtimeMinutes: Math.max(0, effectiveWorked - dailyLimit),
    isPublicHoliday: false,
    overtimeRate: 1.5,
  };
}
```

### Break Tracking

**Saudi law requirement:** 30-minute break after 5 consecutive hours. Break is NOT counted as working time.

**Implementation options:**
1. **Automatic deduction (RECOMMENDED for Kunoz):** Assume 30-minute break per shift. Deduct from total hours. Simple, standard in construction.
2. **Manual break clock-out/in:** Worker clocks out for break, back in after. Accurate but adds friction.
3. **Hybrid:** Auto-deduct by default, allow override if break was shorter/longer.

**For 70 employees across construction sites:** Automatic deduction is the pragmatic choice. Manual break tracking creates friction that workers will ignore.

### Saudi Arabia Labor Law Compliance Summary

| Rule | Value | Source |
|------|-------|--------|
| Max daily hours | 8h (standard), 6h (Ramadan), 7h (hazardous) | Article 98-99 |
| Max weekly hours | 48h (standard), 36h (Ramadan) | Article 98 |
| Max daily including OT | 11 hours | Article 101 |
| Overtime rate | 150% of basic hourly wage | Article 107 |
| Mandatory break | 30 min after 5 consecutive hours | Article 101 |
| Max consecutive work days | 6 | 2025 Amendment |
| Weekly rest day | Friday (default, can be changed) | Article 104 |
| Record retention | 5 years digital records | 2025 Amendment |
| Public holidays | Eid Al-Fitr (4d), Eid Al-Adha (4d), National Day (1d) | Article 112 |
| Compensatory leave | 1.5h leave per 1h OT (with written consent) | 2025 Amendment |
| Night work | 23:00-06:00, requires compensatory benefits | Article 100 |
| Probation period | 180 days (extended in 2025) | 2025 Amendment |
| Notice period | 30 days (employee), 60 days (employer) | 2025 Amendment |
| Qiwa contract authentication | Phased: Oct 2025 -> Aug 2026 | 2025 Amendment |

Sources:
- [HRSD (Ministry): Working Hours](https://www.hrsd.gov.sa/en/knowledge-centre/articles/312)
- [SafwaHR: Complete Guide to Saudi Labor Law Working Hours 2026](https://safwahr.com/complete-guide-to-saudi-labor-law-working-hours-in-2026/)
- [TASC: Saudi Labour Law Updates 2025](https://tascoutsourcing.sa/en/insights/saudi-labour-law-updates-2025)
- [SmartHCM: Overtime Compliance Saudi Arabia 2026](https://smarthcm.cloud/overtime-compliance-in-saudi-arabia/)
- [Skuad: Employment Laws Saudi Arabia 2026](https://www.skuad.io/employment-laws/saudi-arabia)
- [Playroll: Saudi Arabia Working Hours & Overtime](https://www.playroll.com/working-hours/saudi-arabia)

---

## 5. Competitor Analysis

### Feature Matrix: What's Table Stakes

| Feature | Jibble | Hubstaff | TimeCamp | ZKTeco/BioTime | Truein | Workyard |
|---------|--------|----------|----------|----------------|--------|----------|
| GPS clock-in | Yes | Yes | Yes | Via device | Yes | Yes |
| Geofencing | Yes | Yes | Yes | Via device | Yes | Yes |
| Face recognition | Yes | No | No | Yes (hardware) | Yes | Photo ID |
| Offline mode | Yes | Yes | No | Yes (device) | Yes | Yes |
| Kiosk mode | Yes | No | Yes | Yes (hardware) | Yes | No |
| QR/NFC | Yes | No | No | Yes | No | No |
| Overtime calc | Yes | Yes | Yes | Yes | Yes | Yes |
| Shift scheduling | Basic | Advanced | No | Yes | Yes | Basic |
| Reports/export | Yes | Advanced | Advanced | Advanced | Yes | Yes |
| Payroll integration | Xero, QB, Deel | Built-in + PayPal | Via integrations | Via API | Yes | Yes |
| Real-time dashboard | Yes | Yes | Yes | Yes | Yes | Yes |
| Mobile app | Yes | Yes | Yes | Yes | Yes | Yes |
| Multi-site | Yes | Yes | Yes | Yes | Yes | Yes |
| API | Yes | Yes | Yes | Yes (BioTime 8.5+) | Yes | Yes |
| **Free tier** | **Unlimited users** | Single user | **Unlimited users** | No | No | No |
| **Pricing** | From $2.50/user/mo | From $4.99/user/mo | From $1.49/user/mo | Hardware + license | Custom | Custom |

### Product Deep Dives

#### Jibble
**Type:** Cloud SaaS. Mobile-first.
**Strengths:** Generous free tier (unlimited users). Face recognition + GPS. QR/NFC kiosk mode. Offline biometric. Audit trail for ISO-27001.
**Weaknesses:** Basic scheduling. Limited workflow customization.
**Lesson for Kunoz:** The free tier proves GPS + face + QR is achievable in a web/mobile app. Kiosk mode with QR is a real differentiator for construction.

#### Hubstaff
**Type:** Cloud SaaS. Productivity-focused.
**Strengths:** 7 report types. Payroll automation. Geofence auto-clock. Scheduling + attendance tied together. Activity monitoring.
**Weaknesses:** No biometric verification. No kiosk mode. Overkill for simple attendance.
**Lesson for Kunoz:** The reporting depth is aspirational. 7 report types is the gold standard. But don't build productivity monitoring -- it's inappropriate for construction.

#### TimeCamp
**Type:** Cloud SaaS. Project time tracking.
**Strengths:** AI-powered automatic tracking. Project budget management. Free tier with geofencing.
**Weaknesses:** Oriented toward desk workers/agencies, not construction. No biometric. No scheduling.
**Lesson for Kunoz:** The AI categorization is interesting but irrelevant for construction. Project budget tracking is out of scope.

#### ZKTeco / BioTime
**Type:** Hardware + software platform.
**Strengths:** Enterprise-grade biometric (fingerprint, face, iris). Handles 10,000+ employees. Multi-level approval workflows. 70+ attendance policies. Payroll module. Portable devices for construction.
**Weaknesses:** Requires hardware investment. Complex deployment. Not a modern web app.
**Lesson for Kunoz:** BioTime's approval workflows (leave, manual punch, overtime, schedule adjustment) are the gold standard for enterprise attendance. The API (REST, JWT auth) proves hardware-software integration is feasible. The 70+ configurable policies show how deep attendance rules can go -- but start with 5-10 core policies for MVP.

#### Truein
**Type:** Cloud SaaS. Construction/manufacturing focused.
**Strengths:** Face recognition without internet. 70+ customizable policies. Multi-site designed. Construction scheduling. API.
**Weaknesses:** No free tier. India-focused (may not have Saudi labor law built in).
**Lesson for Kunoz:** The 70+ policies are a roadmap for what a mature system looks like. Face recognition working offline proves it's technically feasible (though complex). The construction-first design validates the market need.

#### Workyard
**Type:** Cloud SaaS. Field services.
**Strengths:** Photo ID verification at clock-in. GPS-focused with automatic mileage tracking. Offline mode.
**Weaknesses:** No biometric. No kiosk mode.
**Lesson for Kunoz:** Photo capture at clock-in is a simple but effective buddy-punch prevention that doesn't require biometric AI. Consider as a Phase 2 feature.

### What Kunoz Should Learn from Competitors

1. **GPS + geofencing is non-negotiable.** Every single competitor has it.
2. **Offline support is table stakes for construction.** Truein, Jibble, Workyard, ZKTeco all support it.
3. **Multiple clock-in methods matter.** Self, supervisor, kiosk, QR -- offer at least 2-3.
4. **Reports make or break the product for HR.** Hubstaff's 7 report types is the benchmark.
5. **Don't build payroll.** Even mature products (Jibble, TimeCamp) integrate with existing payroll systems rather than building their own.
6. **Approval workflows add enterprise value.** BioTime's multi-level approval is what distinguishes enterprise from SMB tools.
7. **Photo capture is cheap buddy-punch prevention.** Simpler than biometric AI, nearly as effective.

Sources:
- [Jibble: Best Time Tracking Software (comparison)](https://www.jibble.io/best-time-tracking-software)
- [Hubstaff vs Jibble](https://hubstaff.com/hubstaff-vs-jibble)
- [Jibble: Time and Attendance Software Reviewed](https://www.jibble.io/best-software/time-and-attendance-tracking-software)
- [ZKBio Time Features](https://www.zkteco.com/en/ZKBioTime/ZKBioTime)
- [BioTime 9.5 Datasheet](https://www.zkteco.me/product-details/biotime-95)
- [ZKBio Time API](https://www.zkteco.com/en/ZKBioTime_API)
- [Truein: Construction Attendance Software](https://truein.com/construction-industry-attendance-software)
- [Workyard: Construction Time Clock Apps](https://www.workyard.com/compare/construction-time-clock-apps)
- [tmetric: Best Attendance Tracking Software 2026](https://tmetric.com/best-software/top-9-best-attendance-tracking-software-tools-for-2025-free-paid-options)

---

## 6. Architecture Recommendation for Kunoz

### Why Custom-Built (Not SaaS)

For 70 employees, a SaaS tool like Jibble ($2.50/user/mo = $175/mo) would be cheaper short-term. The business case for custom-built is:

1. **Saudi labor law integration:** No SaaS tool perfectly implements Saudi overtime rules with Ramadan mode
2. **No recurring per-user cost:** Custom system scales to 700 employees at zero marginal software cost
3. **Full data ownership:** Attendance data stays in Kunoz's Supabase instance, not a third-party
4. **Custom workflows:** Tailor supervisor batch clock-in, reporting, and alerts to Kunoz's exact operational model
5. **Demo/showcase value:** Building this demonstrates capability for Qualia Solutions

### Recommended Tech Architecture

See `ARCHITECTURE.md` for full details. Summary:

- **Frontend:** Next.js 16 PWA (App Router, server components for admin, client components for clock-in)
- **Backend:** Supabase (Postgres + PostGIS + Auth + Realtime + RLS + Edge Functions)
- **Offline:** Service Worker (Serwist) + IndexedDB (idb) + Background Sync
- **Geolocation:** Browser Geolocation API + PostGIS `ST_DWithin` for server validation
- **Maps:** Leaflet (free, no API key) for admin location overview
- **Export:** SheetJS for Excel, jsPDF for PDF

### Data Model Core

See `ARCHITECTURE.md` for full schema. Key tables:
- `locations` (with PostGIS geofence_center)
- `employees` (with role, location assignment)
- `shifts` (with Ramadan flag)
- `attendance_records` (fact table with GPS, method, sync status)
- `attendance_corrections` (audit trail)
- `settings` (configurable rules)

---

## 7. Open Questions for Client Discussion

1. **Self vs supervisor clock-in preference:** Does Kunoz want workers to self-clock, or should supervisors manage attendance?
2. **Smartphone prevalence:** What percentage of workers have smartphones? This determines if kiosk/NFC is needed.
3. **Existing HR/payroll systems:** What does Kunoz currently use for payroll? Excel export format requirements?
4. **Internet reliability per site:** Which of the 8 locations have reliable internet? Which need offline-first?
5. **Shift patterns:** Are all locations on the same shift schedule, or do they vary?
6. **Overtime approval:** Should overtime be pre-approved, or just tracked and reported?
7. **Language:** Confirmed English-only? Arabic names will display correctly but all UI will be English.
8. **Demo scope:** Is this a functional demo or a production-ready system? This determines quality bar.
