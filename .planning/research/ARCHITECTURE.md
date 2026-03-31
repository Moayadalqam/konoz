# Architecture Patterns

**Domain:** Workforce Attendance & Time Tracking (Construction/Manufacturing)
**Researched:** 2026-03-31

## Recommended Architecture

### High-Level Overview

```
+------------------+     +-------------------+     +------------------+
|  Worker Device   |     | Supervisor Device  |     |   Admin Panel    |
|  (Phone/Tablet)  |     |   (Phone/Tablet)   |     |   (Desktop)      |
+--------+---------+     +---------+----------+     +--------+---------+
         |                         |                          |
         |  GPS + Clock-In        |  Batch Clock-In          |  Manage All
         |                         |                          |
+--------v-------------------------v--------------------------v---------+
|                        Next.js App (PWA)                              |
|  +-------------+  +---------------+  +-------------+  +------------+ |
|  | Clock-In    |  | Dashboard     |  | Reports     |  | Admin      | |
|  | Module      |  | (Real-time)   |  | Module      |  | Module     | |
|  +------+------+  +-------+-------+  +------+------+  +-----+-----+ |
|         |                  |                 |               |        |
|  +------v------------------v-----------------v---------------v------+ |
|  |                    Service Worker (Serwist)                      | |
|  |  +------------------+  +-------------------+  +---------------+  | |
|  |  | Asset Cache      |  | Sync Queue        |  | Offline       |  | |
|  |  | (Cache-First)    |  | (IndexedDB)       |  | Fallback      |  | |
|  |  +------------------+  +-------------------+  +---------------+  | |
|  +------------------------------------------------------------------+ |
+-----------------------------------+-----------------------------------+
                                    |
                        Online: REST API / Realtime WS
                        Offline: Queued in IndexedDB
                                    |
+-----------------------------------v-----------------------------------+
|                         Supabase                                      |
|  +------------------+  +-------------------+  +--------------------+  |
|  | Auth             |  | Postgres + PostGIS|  | Realtime           |  |
|  | (Email/Password) |  | (RLS Enabled)     |  | (Postgres Changes) |  |
|  +------------------+  +-------------------+  +--------------------+  |
|  +------------------+  +-------------------+  +--------------------+  |
|  | Storage          |  | Edge Functions    |  | pg_cron            |  |
|  | (Photo capture)  |  | (Alerts, cron)    |  | (Scheduled checks) |  |
|  +------------------+  +-------------------+  +--------------------+  |
+-----------------------------------------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Clock-In Module** | GPS capture, geofence validation, time recording, photo capture (optional) | IndexedDB (always), Supabase (when online) |
| **Sync Engine** | Queue offline mutations, replay on connectivity, conflict resolution | IndexedDB, Service Worker, Supabase REST API |
| **Dashboard** | Real-time attendance view, headcounts per location, today's events | Supabase Realtime (WebSocket), Supabase REST |
| **Reports Module** | Generate attendance summaries, overtime reports, absence lists, export | Supabase REST (read-only queries) |
| **Admin Module** | Employee CRUD, location CRUD, shift definitions, role management | Supabase REST (CRUD operations) |
| **Service Worker** | Cache assets, intercept failed requests, trigger background sync | Browser APIs, IndexedDB, Serwist |
| **Auth Layer** | Login, session management, role-based routing | Supabase Auth, middleware |

### Data Flow

#### Clock-In Flow (Online)
```
1. Worker opens app -> clicks "Clock In"
2. Browser requests GPS coordinates (Geolocation API)
3. Client validates: coordinates within assigned location's geofence radius
4. If valid: write attendance record to Supabase
5. Supabase Realtime broadcasts to supervisor's dashboard
6. UI shows success with timestamp
```

#### Clock-In Flow (Offline)
```
1. Worker opens app (cached by service worker) -> clicks "Clock In"
2. Browser requests GPS coordinates (works offline)
3. Client validates geofence locally (location data cached in IndexedDB)
4. Write attendance record to IndexedDB with `synced: false`
5. Register Background Sync event OR add to sync queue
6. UI shows success with "will sync when online" indicator
7. [Later] Connectivity returns -> sync queue replays -> Supabase updated
8. Mark records as `synced: true` in IndexedDB
```

#### Supervisor Batch Clock-In Flow
```
1. Supervisor opens app -> selects "Batch Clock-In"
2. GPS captured once (supervisor's location)
3. Supervisor selects workers from crew list (checkboxes)
4. Single submission creates N attendance records with supervisor's GPS
5. Each record tagged with `method: 'supervisor_batch'` for audit
```

## Database Schema

### Core Tables

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Locations / Job Sites
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  geofence_center GEOGRAPHY(Point, 4326) NOT NULL,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 200,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id),
  employee_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'worker')),
  primary_location_id UUID REFERENCES locations(id),
  department TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 30,
  is_ramadan BOOLEAN DEFAULT FALSE,
  location_id UUID REFERENCES locations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee-Shift Assignments
CREATE TABLE employee_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  shift_id UUID REFERENCES shifts(id) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  UNIQUE(employee_id, effective_from)
);

-- Attendance Records (FACT TABLE)
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  location_id UUID REFERENCES locations(id) NOT NULL,
  shift_id UUID REFERENCES shifts(id),
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  clock_in_lat DOUBLE PRECISION,
  clock_in_lng DOUBLE PRECISION,
  clock_out_lat DOUBLE PRECISION,
  clock_out_lng DOUBLE PRECISION,
  clock_in_method TEXT DEFAULT 'self' CHECK (clock_in_method IN ('self', 'supervisor_batch', 'qr_kiosk', 'manual_correction')),
  clock_out_method TEXT CHECK (clock_out_method IN ('self', 'supervisor_batch', 'qr_kiosk', 'manual_correction', 'auto_shift_end')),
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'late', 'early_departure', 'absent', 'on_leave')),
  is_overtime BOOLEAN DEFAULT FALSE,
  overtime_minutes INTEGER DEFAULT 0,
  total_hours NUMERIC(5,2),
  notes TEXT,
  submitted_by UUID REFERENCES employees(id),  -- supervisor who submitted batch
  is_corrected BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,  -- NULL if created offline and not yet synced
  client_created_at TIMESTAMPTZ NOT NULL,  -- timestamp from client device (for conflict resolution)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance Corrections (Audit Trail)
CREATE TABLE attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID REFERENCES attendance_records(id) NOT NULL,
  requested_by UUID REFERENCES employees(id) NOT NULL,
  approved_by UUID REFERENCES employees(id),
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings (Global and per-location)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  location_id UUID REFERENCES locations(id),  -- NULL = global
  UNIQUE(key, location_id)
);
```

### Key Indexes

```sql
-- Fast lookup: today's attendance per location
CREATE INDEX idx_attendance_location_date ON attendance_records (location_id, clock_in);

-- Fast lookup: employee's attendance history
CREATE INDEX idx_attendance_employee_date ON attendance_records (employee_id, clock_in);

-- Geospatial index for geofence queries
CREATE INDEX idx_locations_geofence ON locations USING GIST (geofence_center);

-- Unsynced records (for sync queue monitoring)
CREATE INDEX idx_attendance_unsynced ON attendance_records (synced_at) WHERE synced_at IS NULL;
```

### RLS Policies

```sql
-- Workers see only their own attendance
CREATE POLICY "Workers see own attendance" ON attendance_records
  FOR SELECT USING (employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid()));

-- Supervisors see their location's attendance
CREATE POLICY "Supervisors see location attendance" ON attendance_records
  FOR SELECT USING (
    location_id IN (
      SELECT primary_location_id FROM employees
      WHERE auth_user_id = auth.uid() AND role = 'supervisor'
    )
  );

-- Admins see everything
CREATE POLICY "Admins see all" ON attendance_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role = 'admin')
  );
```

## Patterns to Follow

### Pattern 1: Optimistic UI with Sync Queue
**What:** Write to IndexedDB immediately, show success, sync in background.
**When:** Every write operation (clock-in, clock-out, corrections).
**Example:**
```typescript
async function clockIn(employeeId: string, coords: GeolocationCoordinates) {
  const record = {
    id: crypto.randomUUID(),
    employee_id: employeeId,
    clock_in: new Date().toISOString(),
    clock_in_lat: coords.latitude,
    clock_in_lng: coords.longitude,
    client_created_at: new Date().toISOString(),
    synced: false,
  };

  // 1. Write locally FIRST (instant)
  await db.put('attendance', record);

  // 2. Try to sync immediately
  try {
    await supabase.from('attendance_records').insert(record);
    await db.put('attendance', { ...record, synced: true });
  } catch {
    // 3. If offline, register for background sync
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('sync-attendance');
    }
  }
}
```

### Pattern 2: Geofence Validation
**What:** Check if worker's GPS coordinates are within assigned location's geofence.
**When:** Every clock-in attempt.
**Example:**
```typescript
function isWithinGeofence(
  workerLat: number,
  workerLng: number,
  fenceLat: number,
  fenceLng: number,
  radiusMeters: number
): boolean {
  // Haversine formula for distance
  const R = 6371000; // Earth's radius in meters
  const dLat = (fenceLat - workerLat) * Math.PI / 180;
  const dLng = (fenceLng - workerLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(workerLat * Math.PI / 180) *
    Math.cos(fenceLat * Math.PI / 180) *
    Math.sin(dLng/2) ** 2;
  const d = 2 * R * Math.asin(Math.sqrt(a));
  return d <= radiusMeters;
}
```

### Pattern 3: Saudi Overtime Calculation
**What:** Calculate overtime per Saudi labor law (150% after 8h/day or 48h/week; 6h/day during Ramadan).
**When:** At clock-out or daily reconciliation.
**Example:**
```typescript
function calculateOvertime(
  clockIn: Date,
  clockOut: Date,
  breakMinutes: number,
  isRamadan: boolean
): { regularMinutes: number; overtimeMinutes: number } {
  const totalMinutes = (clockOut.getTime() - clockIn.getTime()) / 60000 - breakMinutes;
  const dailyLimitMinutes = isRamadan ? 360 : 480; // 6h or 8h

  if (totalMinutes <= dailyLimitMinutes) {
    return { regularMinutes: totalMinutes, overtimeMinutes: 0 };
  }

  return {
    regularMinutes: dailyLimitMinutes,
    overtimeMinutes: totalMinutes - dailyLimitMinutes,
  };
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Network-First Attendance Writes
**What:** Attempting Supabase insert first, falling back to IndexedDB on failure.
**Why bad:** On slow networks, the UI hangs. Workers standing at site entrance waiting 30 seconds for a clock-in is unacceptable. Creates terrible UX and workers will stop using the system.
**Instead:** Always write to IndexedDB first (optimistic). Sync is an optimization, not a requirement.

### Anti-Pattern 2: Storing Timestamps in Local Time
**What:** Saving `new Date().toString()` or locale-formatted strings.
**Why bad:** Workers move between cities. Daylight saving changes (Saudi doesn't have DST, but the pattern matters). Impossible to do accurate time math.
**Instead:** Always store as ISO 8601 UTC (`new Date().toISOString()`). Convert to `Asia/Riyadh` only for display.

### Anti-Pattern 3: Client-Side-Only Geofence Validation
**What:** Only checking geofence on the client, never on the server.
**Why bad:** A technically savvy person can spoof GPS coordinates in Chrome DevTools or with location spoofing apps.
**Instead:** Validate on client for instant feedback, but ALSO validate on server when syncing. Flag suspicious records (GPS accuracy > 100m, coordinates exactly matching geofence center).

### Anti-Pattern 4: Polling for Real-Time Data
**What:** `setInterval(() => fetch('/api/attendance'), 5000)` for dashboard updates.
**Why bad:** Wastes bandwidth, battery, and Supabase API quota. Introduces unnecessary latency.
**Instead:** Use Supabase Realtime subscriptions. Push-based, instant, efficient.

### Anti-Pattern 5: God Table for Everything
**What:** One `events` table with a `type` column for attendance, leaves, corrections, etc.
**Why bad:** Impossible to enforce constraints. No referential integrity. Reporting becomes complex.
**Instead:** Separate tables per concern (attendance_records, attendance_corrections, settings). Join when needed.

## Scalability Considerations

| Concern | At 70 employees (now) | At 500 employees | At 5,000 employees |
|---------|----------------------|-------------------|---------------------|
| Database rows/day | ~140 records (2 per employee) | ~1,000 records | ~10,000 records |
| Realtime connections | ~10 supervisors + admin | ~50 supervisors | Need connection pooling |
| IndexedDB storage | Negligible | Implement periodic cleanup | Rotate old records to server-only |
| PostGIS queries | Instant | Instant | Ensure spatial index maintained |
| Supabase plan | Free tier sufficient for demo | Pro plan ($25/mo) | Pro plan, possibly read replicas |
| Background sync queue | Simple FIFO | Prioritized queue | Batch sync with chunking |

## Sources

- [Supabase PostGIS Extension Docs](https://supabase.com/docs/guides/database/extensions/postgis)
- [Supabase Realtime Presence Docs](https://supabase.com/docs/guides/realtime/presence)
- [Supabase Realtime Location Sharing with MapLibre](https://supabase.com/blog/postgres-realtime-location-sharing-with-maplibre)
- [Offline-First PWA with Next.js + IndexedDB + Supabase](https://oluwadaprof.medium.com/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9)
- [Strategic Database Design for Shift Management Reporting](https://www.myshyft.com/blog/reporting-database-design/)
- [ER Diagram for Attendance Management](https://itsourcecode.com/uml/employee-attendance-management-system-er-diagram-erd/)
