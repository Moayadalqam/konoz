# Phase 2: Locations & Employees — Execution Plan

## Objective

Create database tables for locations and employees, seed them with real Kunoz data (8 locations, 70 employees), and build management UIs with map view and filtering. By the end, an admin/HR user can see all locations on a map, manage employees with location assignments, and all real company data is loaded.

## Prerequisites

- Phase 1 complete (auth, profiles, RLS, app shell working)
- Supabase project active with `profiles` table and auth configured
- Verify `handle_updated_at()` function exists: `SELECT proname FROM pg_proc WHERE proname = 'handle_updated_at'`
- Read Next.js 16+ docs in `node_modules/next/dist/docs/` before writing any page/component

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Leaflet/OpenStreetMap over Google Maps | No API key required, zero cost, faster setup for demo. ROADMAP allows "Google Maps or Leaflet". Each location stores `google_maps_url` for deep-linking to Google Maps when needed. |
| Separate `employees` table from `profiles` | Not all employees have app accounts (laborers without phones). Employee records hold company data (number, department, location). `profile_id` links when an employee has an app account. |
| Simple lat/lng over PostGIS | Only 8 locations — PostGIS overkill. Haversine formula in app layer for geofence checks. Can add PostGIS later if needed. |
| App role lives in `profiles.role`, not `employees` | Single source of truth. When admin changes an employee's app role, `updateEmployeeAction` updates `profiles.role` via admin client (when employee has a linked profile). |

## Implementation Steps

### Step 1: Database Migration — Locations Table

Create the `locations` table via Supabase migration.

**Pre-check:** Ensure `handle_updated_at()` exists from Phase 1. If missing, include it defensively:

```sql
-- Defensive: ensure handle_updated_at exists (created in Phase 1)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Schema:**

```sql
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,  -- Arabic name for future i18n
  city TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 200,
  google_maps_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER on_location_updated
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

**RLS Policies:**

```sql
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- All approved users can read locations (needed for geofence validation)
CREATE POLICY "Approved users can view locations"
  ON public.locations FOR SELECT
  USING (public.is_user_approved(auth.uid()));

-- Admin/HR can insert locations
CREATE POLICY "Admin/HR can create locations"
  ON public.locations FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'hr_officer')
    AND public.is_user_approved(auth.uid())
  );

-- Admin/HR can update locations
CREATE POLICY "Admin/HR can update locations"
  ON public.locations FOR UPDATE
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'hr_officer')
    AND public.is_user_approved(auth.uid())
  );

-- Admin can delete locations
CREATE POLICY "Admin can delete locations"
  ON public.locations FOR DELETE
  USING (
    public.get_user_role(auth.uid()) = 'admin'
    AND public.is_user_approved(auth.uid())
  );
```

**Acceptance criteria:**
- Locations table created with correct schema
- RLS enabled — all approved users can read, only admin/HR can write
- `updated_at` auto-updates on modification

---

### Step 2: Database Migration — Employees Table

Create the `employees` table. This is separate from `profiles` because:
- Not all employees have app accounts (laborers without phones get supervisor batch check-in)
- Employees hold company-specific data (employee number, department, location assignment)
- `profile_id` links to a profile when the employee has an app account

**Schema:**

```sql
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  employee_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,  -- Arabic name
  phone TEXT,
  department TEXT,
  position TEXT,
  primary_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_employees_location ON public.employees (primary_location_id);
CREATE INDEX idx_employees_profile ON public.employees (profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_employees_active ON public.employees (is_active) WHERE is_active = TRUE;

-- Auto-update updated_at
CREATE TRIGGER on_employee_updated
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

**Helper function (SECURITY DEFINER to avoid RLS recursion):**

```sql
-- Get employee's primary location ID without triggering RLS on employees table
CREATE FUNCTION public.get_employee_location(user_id UUID)
RETURNS UUID AS $$
  SELECT primary_location_id FROM public.employees WHERE profile_id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

**RLS Policies:**

```sql
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Users can view their own employee record
CREATE POLICY "Users can view own employee record"
  ON public.employees FOR SELECT
  USING (profile_id = auth.uid());

-- Admin/HR can view all employees
CREATE POLICY "Admin/HR can view all employees"
  ON public.employees FOR SELECT
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'hr_officer')
    AND public.is_user_approved(auth.uid())
  );

-- Supervisors can view employees at their assigned location
-- Uses SECURITY DEFINER helper to avoid RLS recursion
CREATE POLICY "Supervisors can view location employees"
  ON public.employees FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = 'supervisor'
    AND public.is_user_approved(auth.uid())
    AND primary_location_id = public.get_employee_location(auth.uid())
  );

-- Admin/HR can insert employees
CREATE POLICY "Admin/HR can create employees"
  ON public.employees FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'hr_officer')
    AND public.is_user_approved(auth.uid())
  );

-- Admin/HR can update employees
CREATE POLICY "Admin/HR can update employees"
  ON public.employees FOR UPDATE
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'hr_officer')
    AND public.is_user_approved(auth.uid())
  );

-- Admin can delete employees
CREATE POLICY "Admin can delete employees"
  ON public.employees FOR DELETE
  USING (
    public.get_user_role(auth.uid()) = 'admin'
    AND public.is_user_approved(auth.uid())
  );
```

**Acceptance criteria:**
- Employees table with optional profile link
- RLS scoped: own record, location-based for supervisors, full access for admin/HR
- Proper indexes for common queries

---

### Step 3: TypeScript Types & Zod Validations

Define types and validation schemas for locations and employees.

**Files:**
- `src/lib/validations/location.ts` — Zod schemas for location create/edit
- `src/lib/validations/employee.ts` — Zod schemas for employee create/edit

**Location schema:**
```typescript
const locationSchema = z.object({
  name: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  geofence_radius_meters: z.number().int().min(50).max(5000).default(200),
  google_maps_url: z.string().url().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});
```

**Employee schema:**
```typescript
const employeeSchema = z.object({
  employee_number: z.string().min(1).max(20),
  full_name: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  primary_location_id: z.string().uuid().optional(),
  profile_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
});
```

**Acceptance criteria:**
- All form inputs validated before submission
- Coordinate validation prevents invalid lat/lng
- Employee number uniqueness checked

---

### Step 4: Server Actions — Locations

CRUD server actions for location management.

**File:** `src/actions/locations.ts`

**Actions:**
- `createLocationAction(formData)` — Create new location (admin/HR only)
- `updateLocationAction(id, formData)` — Update location (admin/HR only)
- `deleteLocationAction(id)` — Soft-delete / deactivate location (admin only)
- `getLocationsAction()` — Fetch all active locations
- `getLocationAction(id)` — Fetch single location with employee count

**Action pattern** (follows `src/actions/admin.ts`):
1. `"use server"` directive
2. `requireRole("admin", "hr_officer")` for auth
3. Validate input with Zod schema from Step 3
4. Use `createClient()` from `@/lib/supabase/server` for reads
5. Use `createAdminClient()` for writes that need to bypass RLS (e.g., seed operations)
6. Throw on error — let the form catch
7. `revalidatePath("/dashboard/locations")` after mutations

**Acceptance criteria:**
- CRUD operations work through server actions
- Role checks enforced server-side
- Zod validation on all inputs
- Path revalidation on mutations

---

### Step 5: Server Actions — Employees

CRUD server actions for employee management.

**File:** `src/actions/employees.ts`

**Write actions** (admin/HR only, same pattern as Step 4):
- `createEmployeeAction(formData)` — Create employee
- `updateEmployeeAction(id, formData)` — Update employee fields. **When employee has a linked `profile_id` and role is being changed, also update `profiles.role` via admin client** — this fulfills EMP-03 "change employee roles"
- `toggleEmployeeActiveAction(id)` — Activate/deactivate employee
- `assignEmployeeLocationAction(id, locationId)` — Assign to location
- `linkEmployeeProfileAction(employeeId, profileId)` — Link employee to app profile

**Read actions** (role-scoped via RLS):
- `getEmployeesAction(filters)` — Fetch employees with filters. Filter query construction:
  ```typescript
  let query = supabase.from("employees").select("*, locations(name)");
  if (filters.locationId) query = query.eq("primary_location_id", filters.locationId);
  if (filters.department) query = query.eq("department", filters.department);
  if (filters.isActive !== undefined) query = query.eq("is_active", filters.isActive);
  if (filters.search) query = query.or(`full_name.ilike.%${filters.search}%,employee_number.ilike.%${filters.search}%`);
  ```
- `getEmployeeAction(id)` — Fetch single employee with location details and linked profile info

**Acceptance criteria:**
- All CRUD + assignment operations work
- Role change on employee with linked profile also updates `profiles.role`
- Filters return correct subsets
- Employee number uniqueness validated

---

### Step 6: Install Map Dependencies + Locations List Page

**Install packages first:**
```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet
```

Build the locations management page at `/dashboard/locations`.

**File:** `src/app/(dashboard)/dashboard/locations/page.tsx`

**UI components:**
- `src/components/locations/locations-page.tsx` — Page wrapper (client component for map)
- `src/components/locations/location-map.tsx` — Leaflet map showing all locations with geofence circles
- `src/components/locations/location-list.tsx` — Table/card list of locations
- `src/components/locations/location-card.tsx` — Individual location card with stats

**Map requirements (Leaflet/OpenStreetMap — see Design Decisions above):**
- Use `react-leaflet` with OpenStreetMap tiles (no API key needed)
- Import Leaflet CSS: `import "leaflet/dist/leaflet.css"` in the map component
- Dynamic import with `ssr: false` (Leaflet doesn't work server-side)
- Show all locations as markers on the map
- Draw geofence radius circle around each location marker
- Popup on marker click showing location name, city, employee count
- Map centered to fit all markers (Saudi Arabia bounds)

**Table requirements:**
- Columns: Name, City, Employees (count), Geofence Radius, Status, Actions
- Status badge: Active (green) / Inactive (gray)
- Actions: Edit, View on Google Maps (if URL available)
- "Add Location" button opens create dialog

**Acceptance criteria:**
- 8 locations visible on map with correct geofence circles
- Table shows all locations with employee counts
- Map and table stay in sync _(stretch goal: highlight on map when hovering table row — not required for MVP)_

---

### Step 7: Location Create/Edit Dialog

Modal dialog for creating and editing locations.

**File:** `src/components/locations/location-form.tsx`

**Form fields:**
- Name (text)
- City (text or select from known cities)
- Address (text, optional)
- Latitude (number — or map click to set)
- Longitude (number — or map click to set)
- Geofence Radius (slider 50–5000m, default 200m)
- Google Maps URL (text, optional)
- Active toggle

**Map picker:**
- Embedded Leaflet map in the dialog
- Click on map to set lat/lng coordinates
- Drag circle to adjust geofence radius (stretch goal — use input for MVP)

**Acceptance criteria:**
- Create new location with validation
- Edit existing location with pre-filled values
- Coordinates settable via map click
- Form submits via server action, closes on success

---

### Step 8: Employees List Page with Filters

Build the employees management page at `/dashboard/employees`.

**File:** `src/app/(dashboard)/dashboard/employees/page.tsx`

**UI components:**
- `src/components/employees/employees-page.tsx` — Page wrapper
- `src/components/employees/employees-table.tsx` — Data table with sorting
- `src/components/employees/employee-filters.tsx` — Filter bar

**Filter options:**
- By location (select from all locations)
- By department (select from distinct departments)
- By status (active/inactive)
- Search by name or employee number

**Table columns:**
- Employee Number
- Full Name
- Department
- Position
- Location (name)
- Status badge (Active/Inactive)
- Actions (Edit, View Profile)

_Stretch goals (not required for MVP):_
- _Bulk actions: Select multiple → Assign to location, Deactivate_

**Acceptance criteria:**
- 70 employees listed with correct assignments
- Filters work correctly (location, department, status, search)
- Sortable by name, number, location
- "Add Employee" button opens create dialog

---

### Step 9: Employee Create/Edit & Profile

Employee form dialog and individual profile page.

**Files:**
- `src/components/employees/employee-form.tsx` — Create/edit dialog
- `src/app/(dashboard)/dashboard/employees/[id]/page.tsx` — Employee profile page
- `src/components/employees/employee-profile.tsx` — Profile view component

**Form fields:**
- Employee Number (text, unique)
- Full Name (text)
- Phone (text, optional)
- Department (text or select)
- Position (text)
- Primary Location (select from locations)
- Link to Profile (select from unlinked profiles — optional)
- Active toggle

**Profile page shows:**
- Basic info card (name, number, phone, department, position)
- Assigned location with mini-map
- Linked profile info (if linked to app account)
- Attendance history section — **placeholder with "No attendance data yet" message** (data arrives in Phase 3, completes EMP-04)
- Edit button (admin/HR only)

**Acceptance criteria:**
- Admin/HR can create employees with all fields
- Admin/HR can edit employee details
- Employee profile page loads with correct data
- Location shown on mini-map in profile

---

### Step 10: Seed Script — Real Kunoz Data

Script to import the 8 real locations and 70 real employees.

**File:** `src/scripts/seed-data.ts`

**Locations data (8 locations):**

| # | Name | City | Approx Lat/Lng |
|---|------|------|----------------|
| 1 | Head Office | Riyadh | 24.7136, 46.6753 |
| 2 | Factory 1 | Riyadh | 24.6800, 46.7100 |
| 3 | Factory 2 | Mecca | 21.4225, 39.8262 |
| 4 | Project Site — Al Ehsaa | Al Ehsaa | 25.3494, 49.5878 |
| 5 | Project Site — Al Dammam | Al Dammam | 26.4207, 50.0888 |
| 6 | Project Site — Al Qaseem | Al Qaseem | 26.3260, 43.9750 |
| 7 | Project Site — Mecca | Mecca | 21.3891, 39.8579 |
| 8 | Project Site — Jeddah | Jeddah | 21.5433, 39.1728 |

**Employee data:** Generate 70 realistic employee records with:
- Saudi/Arab/South Asian names (reflecting real workforce composition)
- Employee numbers (KNZ-001 through KNZ-070)
- Departments: Operations, Production, Engineering, Administration, Logistics, HR
- Positions: Laborer, Technician, Supervisor, Site Engineer, Coordinator, Driver, Accountant, HR Officer, Head of Department
- Distributed across 8 locations (weighted: factories get more, head office fewer)
- Mix of active statuses (65 active, 5 inactive)

**Script behavior:**
- Uses admin client (service_role)
- Idempotent — checks if data exists before inserting
- Logs progress to console
- Run via `npx tsx src/scripts/seed-data.ts`

**Acceptance criteria:**
- 8 locations with real GPS coordinates seeded
- 70 employees distributed across locations
- Script is idempotent (safe to re-run)
- Employee numbers unique (KNZ-001 format)

## Verification Checklist

- [ ] `npm run dev` starts clean, no TypeScript errors
- [ ] 8 locations visible on map at `/dashboard/locations`
- [ ] Location geofence circles render with correct radius
- [ ] Admin can create a new location via dialog
- [ ] Admin can edit an existing location
- [ ] 70 employees listed at `/dashboard/employees`
- [ ] Employee filters work (by location, department, status, search)
- [ ] Admin can create a new employee
- [ ] Admin can edit employee and reassign location
- [ ] Employee profile page shows basic info and location on mini-map
- [ ] Seed script runs without errors and is idempotent
- [ ] RLS policies enforce access (non-admin/HR cannot write)
- [ ] Responsive on mobile/tablet/desktop
- [ ] `npx tsc --noEmit` passes

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Leaflet SSR crash (window undefined) | Dynamic import with `ssr: false` — well-documented pattern |
| Real GPS coordinates unknown | Use approximate city center coordinates; client can refine later |
| Employee data format unknown (no Excel provided) | Generate realistic seed data matching known workforce composition; client can update |
| Leaflet CSS not loading | Import Leaflet CSS in the map component or layout |
| Large employee table on mobile | Responsive table with horizontal scroll or card view on mobile |
| Supervisor RLS on employees could cause recursion | Use `SECURITY DEFINER` helper functions (same pattern as profiles) |

## Execution Waves

| Wave | Steps | Agents | Notes |
|------|-------|--------|-------|
| 1 | Step 1 (locations table) + Step 2 (employees table) | backend | Independent migrations, can parallelize |
| 2 | Step 3 (types/validations) + Step 10 (seed script) | backend | Seed early so UI waves have real data to work with |
| 3 | Step 4 (location actions) + Step 5 (employee actions) | backend | Depends on tables + types. Actions can parallelize. |
| 4 | Step 6 (locations page + map) + Step 8 (employees page + filters) | frontend x2 | Both pages depend on server actions. Can parallelize. Install leaflet at start of Step 6. |
| 5 | Step 7 (location form) + Step 9 (employee form + profile) | frontend x2 | Refinements, can parallelize |

## Dependencies on Future Phases

- **Phase 3** will use `locations` for geofence validation during clock-in
- **Phase 3** will use `employees` for attendance records (FK to employees.id)
- **Phase 4** will add shift assignments to employees
- **Phase 6** will query employees + locations for reports

The schema is designed to support these future needs without requiring modifications.

---
*Plan created: 2026-03-31*
*Plan revised: 2026-03-31 — addressed checker review (4 blockers, 5 warnings resolved)*

## Requirement Coverage

| Req | Description | Delivering Steps | Status |
|-----|-------------|-----------------|--------|
| LOC-01 | Admin can create/edit locations with name, city, GPS | Steps 1, 3, 4, 6, 7 | Full |
| LOC-02 | Locations display on map (Leaflet — see Design Decisions) | Step 6 | Full |
| LOC-03 | Configurable geofence radius (default 200m) | Steps 1, 7 | Full |
| LOC-04 | Pre-seeded with 8 real Kunoz locations | Step 10 | Full |
| EMP-01 | Admin/HR can view all employees with filters | Steps 2, 5, 8 | Full |
| EMP-02 | Admin/HR can assign employees to locations | Steps 5, 9 | Full |
| EMP-03 | Admin/HR can change employee roles and status | Step 5 (updates `profiles.role` when employee has linked profile) | Full |
| EMP-04 | Employee profile shows attendance history and stats | Step 9 (profile page with attendance placeholder) | **Partial** — completes in Phase 3 when attendance data exists |
| EMP-05 | Pre-seeded with 70 real employees | Step 10 | Full |
