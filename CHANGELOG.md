# Changelog

## v1.0 — Demo-Ready Attendance System (2026-04-06)

First milestone: complete workforce attendance management system for Kunoz.

### Features

- **Authentication & Roles**: Self-registration, email verification, admin approval, role-based access (admin, HR, supervisor, employee), RLS enforcement
- **Location Management**: 8 real locations with GPS coordinates, Leaflet map view, configurable geofence radius
- **Employee Management**: 70 real employees from Excel data, filters by location/role/status, profile pages with attendance history
- **Attendance Core**: One-tap GPS clock-in/out, geofence validation, supervisor bulk check-in, anomaly flagging, attendance history
- **Shifts & Time Rules**: Shift templates, location/employee assignment, auto-detect late/early/overtime, cross-midnight support
- **Offline & PWA**: Installable PWA, IndexedDB offline queue, auto-sync on reconnect, conflict resolution, app shell caching
- **Reports**: 6 report types (daily, summary, late, overtime, absence, site comparison) with charts and Excel export
- **HR Actions**: Attendance corrections, overtime approval, warnings, leave marking — all with audit trail
- **Notifications**: In-app bell with Supabase Realtime, geofence violation alerts, late arrival alerts, daily summary

### Stats

- 7 phases, 19 commits
- 154 source files, ~21K lines added
- 135/136 UAT tests passed
- 51/51 requirements verified
- Built: Mar 31 – Apr 6, 2026
