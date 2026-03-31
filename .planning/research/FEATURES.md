# Feature Landscape

**Domain:** Workforce Attendance & Time Tracking (Construction/Manufacturing)
**Researched:** 2026-03-31

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| GPS-verified clock-in/out | Every competitor has it. Prevents location fraud. | Medium | Geolocation API + PostGIS `ST_DWithin` for radius check |
| Geofence zones per location | Standard for multi-site operations | Medium | Define center point + radius per location. Workers can only clock in within zone. |
| Real-time attendance dashboard | Supervisors need to see who's on site NOW | Medium | Supabase Realtime Postgres Changes. Live feed of clock events. |
| Daily attendance report | HR's primary operational tool | Low | Query attendance by date, group by location/department |
| Employee management CRUD | Must add/edit/deactivate employees | Low | Basic form with role, location assignment, contact info |
| Location/site management | Multi-site is core requirement (8 locations) | Low | Name, address, geofence coordinates, assigned supervisor |
| Overtime calculation | Saudi law requires 150% pay for overtime hours | Medium | Auto-calculate based on shift definition and clock times |
| Absence tracking | 3.2-3.6% daily absence rate in construction. Must track. | Low | Derive from missing clock-ins against scheduled shifts |
| Late arrival / early departure flags | Standard HR workflow trigger | Low | Compare clock-in time to shift start time |
| Export to Excel/PDF | HR departments run on Excel. Non-negotiable. | Low | xlsx + jsPDF libraries |
| Role-based access | Admin, supervisor, employee roles minimum | Medium | Supabase RLS policies per role |
| Mobile-responsive design | Workers and supervisors use phones on-site | Medium | Tailwind responsive, touch-friendly clock-in buttons |
| PWA installability | "Add to home screen" for quick access | Low | Web App Manifest + service worker |

## Differentiators

Features that set the product apart from generic SaaS tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Saudi labor law engine | Auto-enforce 8h/day, 6h Ramadan, mandatory breaks, overtime rules | High | Configurable rules engine. Major value for Saudi companies. |
| Offline-first clock-in | Works at remote construction sites with no internet | High | IndexedDB + sync queue + Background Sync. Architectural commitment. |
| Supervisor batch clock-in | Supervisor clocks in entire crew at once (for workers without phones) | Medium | Supervisor selects workers from list, single GPS-verified submission |
| Multi-location real-time map | See all 8 locations on one map with live headcounts | Medium | Leaflet map with location markers, live count badges |
| Automated absence alerts | Push notification / dashboard alert when worker doesn't clock in by shift start + grace period | Medium | Scheduled check via Supabase Edge Function or pg_cron |
| Attendance correction workflow | Worker/supervisor requests correction, admin approves | Medium | Status machine: pending -> approved/rejected. Audit trail. |
| Ramadan mode toggle | Switch all locations to 6h/36h-week schedule during Ramadan | Low | Global setting that changes shift calculations and overtime threshold |
| QR code kiosk mode | Tablet at site entrance, workers scan personal QR code | Medium | Generate unique QR per employee. Tablet camera scans. No smartphone needed. |

## Anti-Features

Features to explicitly NOT build in the MVP.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full payroll processing | Massive scope, regulatory complexity, liability | Export hours + overtime data to Excel for payroll team |
| Leave/vacation management | Separate domain, adds significant complexity | Track absences only. Leave requests are a Phase 2+ feature. |
| Productivity monitoring (screenshots, app tracking) | Inappropriate for construction workers. Privacy concerns. | Focus on presence/attendance, not surveillance |
| Project/task time tracking | Construction workers clock into sites, not tasks | Track by location only. Job costing is a separate product. |
| Biometric verification (fingerprint/iris) | Requires hardware investment, not web-native | Use GPS + supervisor verification + optional photo capture |
| Chat/messaging system | Scope creep. Workers have WhatsApp. | Link to WhatsApp groups if communication needed |
| Training/certification tracking | HR module, not attendance | Separate concern entirely |
| Complex shift rotation algorithms | Over-engineering for 70 employees | Simple fixed shift definitions. Manual scheduling by supervisors. |

## Feature Dependencies

```
Employee CRUD -> Location Assignment -> Shift Definition -> Clock-In/Out
                                                              |
Location CRUD -> Geofence Setup -----> Clock-In Validation ---+
                                                              |
                                                              v
                                                     Attendance Records
                                                              |
                                         +--------------------+--------------------+
                                         |                    |                    |
                                    Daily Report      Overtime Calc      Absence Detection
                                         |                    |                    |
                                         v                    v                    v
                                    Dashboard KPIs    Payroll Export      Alert Notifications
```

## MVP Recommendation

Prioritize for demo:
1. **Employee & location management** (table stakes foundation)
2. **GPS-verified clock-in/out** (core product value)
3. **Real-time attendance dashboard** (wow factor for demo)
4. **Daily attendance report + Excel export** (HR operational need)
5. **Supervisor batch clock-in** (differentiator for construction)

Defer:
- **Offline-first**: Critical for production but not needed for demo. Can demonstrate the concept.
- **Saudi labor law engine**: Complex. Demo can show basic overtime. Full engine is Phase 2.
- **QR kiosk mode**: Nice differentiator but not MVP-critical.
- **Attendance corrections workflow**: Can be manual (admin edits) for demo.
- **Automated alerts**: Dashboard visibility is sufficient for demo.

## Sources

- [Truein Construction Attendance Software](https://truein.com/construction-industry-attendance-software)
- [SmartBarrel Construction Time Tracking](https://smartbarrel.io/blog/best-construction-time-tracking-software/)
- [Jibble US Construction Time Tracking](https://www.jibble.io/article/time-and-attendance-tracking-us-construction)
- [Workyard Employee Attendance Tracker](https://www.workyard.com/compare/employee-attendance-tracker)
- [ServiceTitan Construction Time Tracking Apps](https://www.servicetitan.com/blog/top-construction-time-tracking-apps)
- [ABLEMKR Attendance Tools for Construction](https://ablemkr.com/attendance-tools-construction-sites/)
- [Hubstaff vs Jibble Comparison](https://hubstaff.com/hubstaff-vs-jibble)
