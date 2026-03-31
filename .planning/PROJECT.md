# Kunoz — Workforce Attendance Management System

## What This Is

A web-based workforce attendance and time-tracking system for Kunoz, a construction/manufacturing company in Saudi Arabia. It enables employees to clock in/out from mobile devices with GPS verification, supervisors to manage site attendance, and HR to generate reports and take corrective actions. Built as a demo to win the client contract.

## Core Value

**Reliable attendance tracking that works even when the internet doesn't.** Every check-in must be captured — offline, weak signal, or fully connected — and synced accurately to give HR a real-time picture of who's where.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Offline-capable clock-in/out with GPS geofencing
- [ ] Supervisor bulk check-in for laborers without smartphones
- [ ] Multi-site location management with Google Maps integration
- [ ] Real-time attendance dashboard for HR
- [ ] Daily/weekly/monthly attendance reports with export
- [ ] Role-based access (Admin, HR, Supervisor, Employee)
- [ ] Self-registration with role assignment approval
- [ ] Late arrival / early departure tracking
- [ ] Overtime calculation and tracking
- [ ] Absence management and alerts
- [ ] Data seeded from real Excel (70 employees, 8 locations)

### Out of Scope

- Payroll / salary calculation — client explicitly said no ("la, ma badi ishi yikalfni, la yihsibli rawatib")
- Native mobile app — web-first (PWA covers mobile needs)
- Arabic language — English only for v1
- Biometric authentication — no hardware dependency for demo
- Leave management system — defer to v2
- Integration with external HR systems — previous U-Link HR caused problems

## Context

- **Client situation**: Previously used "U-Link HR" which failed. Active dispute. Currently using manual/basic tracking ("Sajjara"). Needs something simple and reliable.
- **Internet problem**: Work sites have unreliable or no internet. Workers say "ma 3indi internet aslan." Offline-first is not a nice-to-have — it's the core differentiator.
- **Workforce composition**: ~70 employees across 8 locations. Multinational (Pakistani, Bangladeshi, Egyptian, Jordanian, Saudi). Roles: Laborers, Supervisors, Site Engineers, HR Officers, Accountants, Coordinators, Drivers, Head of Departments.
- **Locations**: Head Office (Riyadh), Factory 1 (Riyadh), Factory 2 (Mecca), and 5 project sites across Al Ehsaa, Al Damam, Al Qaseem, Mecca, Jeddah. All have GPS coordinates.
- **This is a demo**: Must impress the client with real data, polished UI, and working features. Not just wireframes.

## Constraints

- **Stack**: Next.js + Supabase + Vercel (Qualia standard)
- **Data**: Must use real employee/location data from provided Excel
- **Offline**: Must handle check-ins with no internet at construction sites
- **Budget**: Paid project, no specific budget constraints communicated
- **Timeline**: No hard deadline, but demo-ready is the goal
- **Language**: English only for v1
- **Devices**: Mobile phones + tablets (web app, responsive)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA over native app | Web-first reduces dev time, client needs cross-device access, no app store friction | — Pending |
| Dual check-in (self + supervisor) | Laborers may not have smartphones; supervisors need bulk check-in | — Pending |
| GPS geofencing client-side | Verify location at check-in, server validates on sync | — Pending |
| IndexedDB + sync queue | Offline-first pattern for unreliable internet | — Pending |
| Supabase Auth with role claims | Multi-role access with RLS policies | — Pending |
| Real data seeding | Client wants to see their actual employees/locations in demo | — Pending |

---
*Last updated: 2026-03-31 after initial project definition*
