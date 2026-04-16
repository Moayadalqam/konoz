# Requirements: Kunoz Attendance System

**Defined:** 2026-03-31
**Core Value:** Reliable attendance tracking that works even when the internet doesn't.

## v1 Requirements

### Authentication & Roles

- [ ] **AUTH-01**: User can self-register with email and password
- [ ] **AUTH-02**: User receives email verification after signup
- [ ] **AUTH-03**: Admin/HR can approve registration and assign role (admin, hr_officer, supervisor, employee)
- [ ] **AUTH-04**: User session persists across browser refresh
- [ ] **AUTH-05**: User can reset password via email link
- [ ] **AUTH-06**: Role-based access controls enforced via RLS

### Location Management

- [ ] **LOC-01**: Admin can create/edit locations with name, city, and GPS coordinates
- [ ] **LOC-02**: Locations display on a map with Google Maps integration
- [ ] **LOC-03**: Each location has a configurable geofence radius (default 200m)
- [ ] **LOC-04**: System pre-seeded with 8 real Kunoz locations from Excel data

### Employee Management

- [ ] **EMP-01**: Admin/HR can view all employees with filters (location, role, status)
- [ ] **EMP-02**: Admin/HR can assign employees to locations
- [ ] **EMP-03**: Admin/HR can change employee roles and status (active/inactive)
- [ ] **EMP-04**: Employee profile shows attendance history and stats
- [ ] **EMP-05**: System pre-seeded with 70 real Kunoz employees from Excel data

### Attendance — Clock In/Out

- [ ] **ATT-01**: Employee can clock in with one tap from mobile browser
- [ ] **ATT-02**: Clock-in captures GPS coordinates and validates against assigned location geofence
- [ ] **ATT-03**: Clock-in works offline — stored locally and synced when connection returns
- [ ] **ATT-04**: Employee can clock out with one tap (same offline/GPS behavior)
- [ ] **ATT-05**: System records timestamp, GPS coordinates, online/offline status for each action
- [ ] **ATT-06**: Visual confirmation of successful check-in with location name
- [ ] **ATT-07**: Employee can view their own attendance history

### Attendance — Supervisor

- [ ] **SUP-01**: Supervisor can view live attendance status of their site's employees
- [ ] **SUP-02**: Supervisor can bulk clock-in employees who lack smartphones
- [ ] **SUP-03**: Supervisor can add notes to attendance records (e.g., "left early — medical")
- [ ] **SUP-04**: Supervisor can flag attendance anomalies

### Shift Management

- [ ] **SHF-01**: Admin/HR can define shift templates (name, start time, end time, break duration)
- [ ] **SHF-02**: Shifts can be assigned per location or per employee
- [ ] **SHF-03**: System auto-detects late arrival based on shift start time (grace period configurable)
- [ ] **SHF-04**: System auto-detects early departure based on shift end time
- [ ] **SHF-05**: Overtime calculated when hours exceed shift duration

### Reports & Dashboard

- [ ] **RPT-01**: HR dashboard shows real-time attendance overview (present/absent/late per site)
- [ ] **RPT-02**: Daily attendance report per site with status breakdown
- [ ] **RPT-03**: Weekly/monthly summary report per employee (total hours, overtime, absences)
- [ ] **RPT-04**: Late arrivals report with frequency analysis
- [ ] **RPT-05**: Overtime report per employee and per site
- [ ] **RPT-06**: Absence report with patterns and alerts
- [ ] **RPT-07**: Reports exportable to Excel (.xlsx)
- [ ] **RPT-08**: Site comparison dashboard (attendance rates across all locations)

### HR Actions

- [ ] **HRA-01**: HR can manually correct attendance records (with audit trail)
- [ ] **HRA-02**: HR can approve/reject overtime entries
- [ ] **HRA-03**: HR can generate attendance warning notices
- [ ] **HRA-04**: HR can mark employees as on-leave/absent with reason
- [ ] **HRA-05**: All HR actions logged with timestamp and user for audit

### Offline & PWA

- [ ] **PWA-01**: App installable on mobile devices as PWA (Add to Home Screen)
- [ ] **PWA-02**: Core check-in/out functionality works without internet
- [ ] **PWA-03**: Offline actions queued and auto-synced when connection returns
- [ ] **PWA-04**: Visual indicator showing online/offline status
- [ ] **PWA-05**: Sync conflict resolution (server timestamp wins, manual review for conflicts)
- [ ] **PWA-06**: Cached app shell loads instantly even without internet

### Notifications & Alerts

- [ ] **NTF-01**: HR receives alert when employee checks in outside geofence
- [ ] **NTF-02**: HR receives daily summary notification of attendance anomalies
- [ ] **NTF-03**: Supervisor receives alert when assigned employee is late beyond threshold
- [ ] **NTF-04**: Employee receives confirmation after successful sync of offline check-ins

## v2 Requirements

### Advanced Features

- **ADV-01**: SMS-based check-in fallback for workers without smartphones
- **ADV-02**: Photo capture at check-in for identity verification
- **ADV-03**: QR code check-in at site entry points
- **ADV-04**: Arabic language support (full i18n)
- **ADV-05**: Leave request and approval workflow
- **ADV-06**: Integration with payroll systems (export hours in payroll format)
- **ADV-07**: Automated weekly email reports to management
- **ADV-08**: Employee self-service portal (view pay slips, request leave)
- **ADV-09**: Multi-company support (Kunoz as first tenant)
- **ADV-10**: Mobile push notifications via FCM

## Out of Scope

| Feature | Reason |
|---------|--------|
| Payroll / salary calculation | Client explicitly excluded — "la yihsibli rawatib" |
| Native mobile app (iOS/Android) | Web PWA covers mobile needs, reduces dev/review time |
| Biometric (fingerprint/face) | Requires hardware, not suitable for demo phase |
| Real-time chat / messaging | Not core to attendance tracking |
| Employee scheduling / roster | Too complex for v1, shifts are sufficient |
| Integration with U-Link HR | Active dispute with vendor, client wants clean break |
| Video surveillance integration | Out of scope for attendance system |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| LOC-01 | Phase 2 | Pending |
| LOC-02 | Phase 2 | Pending |
| LOC-03 | Phase 2 | Pending |
| LOC-04 | Phase 2 | Pending |
| EMP-01 | Phase 2 | Pending |
| EMP-02 | Phase 2 | Pending |
| EMP-03 | Phase 2 | Pending |
| EMP-04 | Phase 2 | Pending |
| EMP-05 | Phase 2 | Pending |
| ATT-01 | Phase 3 | Pending |
| ATT-02 | Phase 3 | Pending |
| ATT-03 | Phase 3 | Pending |
| ATT-04 | Phase 3 | Pending |
| ATT-05 | Phase 3 | Pending |
| ATT-06 | Phase 3 | Pending |
| ATT-07 | Phase 3 | Pending |
| SUP-01 | Phase 3 | Pending |
| SUP-02 | Phase 3 | Pending |
| SUP-03 | Phase 3 | Pending |
| SUP-04 | Phase 3 | Pending |
| SHF-01 | Phase 4 | Pending |
| SHF-02 | Phase 4 | Pending |
| SHF-03 | Phase 4 | Pending |
| SHF-04 | Phase 4 | Pending |
| SHF-05 | Phase 4 | Pending |
| PWA-01 | Phase 5 | Pending |
| PWA-02 | Phase 5 | Pending |
| PWA-03 | Phase 5 | Pending |
| PWA-04 | Phase 5 | Pending |
| PWA-05 | Phase 5 | Pending |
| PWA-06 | Phase 5 | Pending |
| RPT-01 | Phase 6 | Pending |
| RPT-02 | Phase 6 | Pending |
| RPT-03 | Phase 6 | Pending |
| RPT-04 | Phase 6 | Pending |
| RPT-05 | Phase 6 | Pending |
| RPT-06 | Phase 6 | Pending |
| RPT-07 | Phase 6 | Pending |
| RPT-08 | Phase 6 | Pending |
| HRA-01 | Phase 6 | Pending |
| HRA-02 | Phase 6 | Pending |
| HRA-03 | Phase 6 | Pending |
| HRA-04 | Phase 6 | Pending |
| HRA-05 | Phase 6 | Pending |
| NTF-01 | Phase 7 | Pending |
| NTF-02 | Phase 7 | Pending |
| NTF-03 | Phase 7 | Pending |
| NTF-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 51 total
- Mapped to phases: 51
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
