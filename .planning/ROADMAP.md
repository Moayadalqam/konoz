# Roadmap: Kunoz v1.0

**Milestone:** v1.0 — Demo-Ready Attendance System
**Phases:** 7
**Created:** 2026-03-31

## Phase Overview

| # | Phase | Status | Dependencies | Requirements |
|---|-------|--------|--------------|--------------|
| 1 | Project Setup & Auth | verified | — | AUTH-01–06 |
| 2 | Locations & Employees | verified | Phase 1 | LOC-01–04, EMP-01–05 |
| 3 | Attendance Core | verified | Phase 2 | ATT-01–07, SUP-01–04 |
| 4 | Shifts & Time Rules | verified | Phase 3 | SHF-01–05 |
| 5 | Offline & PWA | verified | Phase 3 | PWA-01–06 |
| 6 | Reports & HR Actions | in-progress | Phase 4 | RPT-01–08, HRA-01–05 |
| 7 | Notifications & Polish | pending | Phase 6 | NTF-01–04 |

## Phase Details

### Phase 1: Project Setup & Auth
**Goal:** Next.js project scaffolded, Supabase configured, auth working with role-based access.

**Scope:**
- Initialize Next.js 16+ project with TypeScript, Tailwind, shadcn/ui
- Set up Supabase project with auth, database schema, and RLS
- Implement self-registration flow with email verification
- Role management: admin approves registrations, assigns roles
- Password reset flow
- Protected routes by role (admin, hr_officer, supervisor, employee)
- App layout with responsive navigation

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06

**Definition of Done:**
- User can register, verify email, login
- Admin can approve users and assign roles
- Routes protected by role — unauthorized redirected
- RLS policies enforce data access per role
- Responsive layout renders on mobile/tablet/desktop

---

### Phase 2: Locations & Employees
**Goal:** All 8 locations and 70 employees loaded from real data, manageable via UI.

**Scope:**
- Database tables for locations (name, city, lat/lng, geofence_radius, google_maps_url)
- Database tables for employees (linked to auth users, assigned location, position)
- Seed script imports real data from Excel
- Location management UI with map view (Google Maps or Leaflet)
- Employee list with filters (by location, role, status)
- Employee profile page with assignment management
- Admin can CRUD locations and manage employee assignments

**Requirements:** LOC-01, LOC-02, LOC-03, LOC-04, EMP-01, EMP-02, EMP-03, EMP-04, EMP-05

**Definition of Done:**
- 8 real locations visible on map with geofence radius
- 70 real employees listed with correct assignments
- Admin can create/edit locations and reassign employees
- Employee profile shows basic info and location

---

### Phase 3: Attendance Core
**Goal:** Employees can clock in/out with GPS verification. Supervisors can manage site attendance.

**Scope:**
- Clock-in/out endpoint with GPS coordinate capture
- Client-side geofence validation (distance from assigned location)
- Server-side geofence validation on sync
- Attendance record storage (timestamp, coords, status, method)
- One-tap check-in UI optimized for mobile
- Visual confirmation with location name and status
- Employee attendance history view
- Supervisor dashboard: live site attendance
- Supervisor bulk check-in for employees without phones
- Supervisor notes and anomaly flagging

**Requirements:** ATT-01–07, SUP-01–04

**Definition of Done:**
- Employee taps "Clock In" -> GPS captured -> geofence validated -> record stored
- Works on mobile browser (Chrome Android, Safari iOS)
- Supervisor can see who's checked in at their site
- Supervisor can bulk check-in selected employees
- Attendance records accurate and queryable

---

### Phase 4: Shifts & Time Rules
**Goal:** Shifts defined, auto-detection of late/early/overtime.

**Scope:**
- Shift template management (name, start, end, break)
- Assign shifts to locations or individual employees
- Auto-detect late arrival (clock-in > shift start + grace period)
- Auto-detect early departure (clock-out < shift end)
- Overtime calculation (hours beyond shift duration)
- Shift display on attendance records
- Grace period configurable per shift

**Requirements:** SHF-01, SHF-02, SHF-03, SHF-04, SHF-05

**Definition of Done:**
- At least 2 shift templates created (e.g., "Day Shift 7am-5pm", "Factory Shift 8am-4pm")
- Late/early detection works and marks records accordingly
- Overtime hours calculated and stored
- Shift info visible on attendance records

---

### Phase 5: Offline & PWA
**Goal:** App works without internet. Check-ins stored locally and synced automatically.

**Scope:**
- PWA manifest and service worker setup (next-pwa or Serwist)
- App shell caching for instant offline load
- IndexedDB storage for offline attendance records
- Sync queue: actions stored offline, replayed on reconnect
- Online/offline status indicator in UI
- Background sync when connection returns
- Conflict resolution strategy (server timestamp wins)
- "Add to Home Screen" prompt and installability

**Requirements:** PWA-01, PWA-02, PWA-03, PWA-04, PWA-05, PWA-06

**Definition of Done:**
- App installs on mobile home screen
- Check-in works with airplane mode on
- Records sync automatically when internet returns
- User sees clear online/offline indicator
- No data loss in offline -> online transition

---

### Phase 6: Reports & HR Actions
**Goal:** HR can view comprehensive reports and take corrective actions.

**Plans:** 7 plans

Plans:
- [ ] 6-01-PLAN.md — Install packages + create TypeScript types and Zod schemas
- [ ] 6-02-PLAN.md — Database migration (hr_action_logs, employee_warnings tables + attendance_records columns)
- [ ] 6-03-PLAN.md — Report server actions (daily, summary, late, overtime, absence, site comparison, trends)
- [ ] 6-04-PLAN.md — HR action server actions (correction, overtime approval, warning, leave, audit log)
- [ ] 6-05-PLAN.md — Report UI (charts, tables, filters, Excel export, reports page)
- [ ] 6-06-PLAN.md — HR action UI (correction dialog, overtime queue, warning/leave dialogs, audit log, HR actions page)
- [ ] 6-07-PLAN.md — Integration (navigation updates, HR dashboard enhancement, build verification)

**Scope:**
- HR dashboard with real-time KPIs (present/absent/late counts per site)
- Daily attendance report per site
- Weekly/monthly employee summary (hours, overtime, absences)
- Late arrivals frequency report
- Overtime report (per employee, per site)
- Absence patterns and alerts
- Export all reports to Excel (.xlsx)
- Site comparison dashboard (attendance rates)
- Manual attendance correction with audit trail
- Overtime approval workflow
- Warning notice generation
- Leave/absence marking with reason
- All HR actions logged for audit

**Requirements:** RPT-01–08, HRA-01–05

**Definition of Done:**
- HR sees live dashboard with per-site breakdown
- All 8 report types generate with real data
- Excel export produces valid .xlsx file
- HR can correct a record and audit trail is visible
- Overtime approval flow works end-to-end

---

### Phase 7: Notifications & Polish
**Goal:** System proactively alerts on issues. Final UI polish for demo.

**Scope:**
- In-app notification system (bell icon with unread count)
- Geofence violation alerts to HR
- Daily anomaly summary for HR
- Late arrival alerts to supervisors
- Sync confirmation notifications to employees
- Final UI polish: animations, transitions, loading states
- Error handling and edge cases
- Performance optimization
- Demo walkthrough preparation

**Requirements:** NTF-01, NTF-02, NTF-03, NTF-04

**Definition of Done:**
- HR receives in-app alerts for geofence violations
- Supervisor sees late arrival notifications
- Employee gets sync confirmation
- UI polished, no janky states
- Demo flow smooth end-to-end

---
*Roadmap created: 2026-03-31*
*Last updated: 2026-04-01 — Phase 6 planned (7 plans, 4 waves)*
