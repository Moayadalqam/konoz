# Research Summary: Kunoz Workforce Attendance System

**Domain:** Workforce Attendance & Time Tracking for Construction/Manufacturing
**Researched:** 2026-03-31
**Overall confidence:** HIGH

## Executive Summary

Kunoz is a Saudi construction/manufacturing company with ~70 employees across 8 locations (Riyadh, Mecca, Jeddah, etc.). The attendance system needs to handle blue-collar workforce tracking with reliable clock-in/out, offline capability for remote construction sites, Saudi labor law compliance, and multi-site management -- all built as a Next.js + Supabase web application.

The construction attendance tracking space is mature, with clear table-stakes features established by products like Jibble, Hubstaff, ZKTeco/BioTime, and Truein. GPS geofencing, buddy-punch prevention, and offline support are now baseline expectations. The differentiator for a custom-built system is deep integration with Saudi labor law (8h/day, 6h Ramadan, 150% overtime, mandatory 5-year record retention) and the ability to tailor workflows exactly to Kunoz's operational model without per-user SaaS fees scaling indefinitely.

The offline-first architecture is well-proven for Next.js + Supabase in 2026: IndexedDB as local source of truth, service workers via Serwist/Workbox for caching, a sync queue pattern with Background Sync API, and last-write-wins conflict resolution. This pattern has been documented extensively and battle-tested in production applications.

The biggest risk is scope creep -- attendance systems easily balloon into full HR platforms. The MVP should focus strictly on clock-in/out with location verification, basic shift management, and essential reports. Payroll integration, advanced analytics, and leave management are Phase 2+ concerns.

## Key Findings

**Stack:** Next.js 16 + Supabase (PostGIS, Realtime, RLS) + PWA (Serwist + IndexedDB via `idb`) + Geolocation API
**Architecture:** Offline-first PWA with IndexedDB as local truth, sync queue to Supabase, real-time dashboard for supervisors
**Critical pitfall:** Building a full HR suite instead of an attendance system. Keep scope razor-focused on time tracking.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation & Data Model** - Core database schema, auth, employee/location CRUD
   - Addresses: Employee management, location setup, role-based access
   - Avoids: Building without a solid data foundation

2. **Clock-In/Out Engine** - GPS geofencing, multiple check-in methods, supervisor workflows
   - Addresses: The primary product value -- accurate attendance capture
   - Avoids: Over-engineering verification before core flow works

3. **Offline-First & PWA** - Service worker, IndexedDB, sync queue, installability
   - Addresses: Unreliable internet at construction sites
   - Avoids: Retrofitting offline later (much harder than building it in)

4. **Shift Management & Saudi Labor Compliance** - Shift definitions, overtime calculation, Ramadan rules
   - Addresses: Legal compliance, automated overtime at 150%
   - Avoids: Manual overtime calculations (error-prone, legally risky)

5. **Reporting & Dashboard** - Real-time dashboard, attendance reports, export
   - Addresses: HR operational needs, management visibility
   - Avoids: Building reports before data collection is solid

6. **Polish & Demo Prep** - UI refinement, demo data, walkthrough flow
   - Addresses: Client presentation readiness
   - Avoids: Shipping unpolished demo to client

**Phase ordering rationale:**
- Phase 1 before 2: Can't track attendance without employees and locations in the system
- Phase 2 before 3: Core clock-in logic must work before adding offline complexity
- Phase 3 early (not late): Offline-first is an architecture decision, not a feature bolt-on
- Phase 4 after 3: Shift rules depend on reliable attendance data flowing in
- Phase 5 last before polish: Reports consume data from all previous phases

**Research flags for phases:**
- Phase 2: May need deeper research on Geolocation API accuracy in Saudi conditions (GPS drift near tall buildings in Riyadh)
- Phase 3: Background Sync API browser support gaps -- Safari fallback needed
- Phase 4: Saudi labor law nuances may need legal review (especially 2025 amendments re: compensatory leave)
- Phase 5: Standard patterns, unlikely to need research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js + Supabase is well-documented for PWA + offline patterns |
| Features | HIGH | Competitor analysis gives clear table-stakes picture |
| Architecture | HIGH | Multiple 2026 tutorials document exact stack (Next.js + IndexedDB + Supabase) |
| Pitfalls | MEDIUM | Saudi labor law specifics may have edge cases not covered in web research |
| Offline patterns | HIGH | Well-proven architecture with Serwist/Workbox + IndexedDB |

## Gaps to Address

- Exact GPS accuracy/reliability at each of the 8 Kunoz locations (field testing needed)
- Whether Kunoz wants supervisor-driven or self-service clock-in (business decision)
- Integration requirements with existing payroll/HR systems (if any)
- Workers without smartphones -- what percentage, and is kiosk/NFC/supervisor-scan needed?
- Ramadan shift schedule specifics for each location
- Data from the Excel file (locations and employees) needs to be extracted for seeding
