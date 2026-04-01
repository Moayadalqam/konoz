# Phase 4: Shifts & Time Rules — Execution Plan

## Objective

Define shift templates, assign them to locations/employees, and auto-detect late arrival, early departure, and overtime. This phase layers time-rule intelligence onto the attendance records created in Phase 3, transforming raw clock-in/out data into meaningful workforce status.

## Prerequisites

- Phase 3 complete: `attendance_records` table exists with `shift_id` column (nullable FK slot), `status` column (currently defaulting to 'present'), `total_minutes`, `is_overtime`, `overtime_minutes` fields
- Existing helper functions: `get_user_role()`, `is_user_approved()`, `get_employee_id_for_user()`
- Existing server action patterns in `src/actions/` (Zod validation, `requireRole()`, `revalidatePath()`)
- Existing validation patterns in `src/lib/validations/`
- Read Next.js 16+ docs in `node_modules/next/dist/docs/` before writing pages

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| `shifts` table with location + employee assignment | SHF-02 requires "per location or per employee." Use a `shift_assignments` join table for flexibility. A shift template is reusable; assignments link it to a location or specific employee. |
| Grace period on the shift, not global | Each site has different tolerance. Factory floor = strict 5min, office = 15min. `grace_period_minutes` column on `shifts`. |
| Auto-detection runs on clock-in/out write, not as a cron | Immediate feedback to employees/supervisors. Run detection logic in the server action after inserting/updating attendance. No background job complexity. |
| Status update is server-side only | Client doesn't determine late/early — server computes based on shift rules. Prevents manipulation. |
| Overtime = total_minutes > shift duration | Simple calculation: if `total_minutes > (shift_end - shift_start - break_duration)`, the excess is overtime. |
| Employee-level shift overrides location-level | If an employee has a specific shift assignment, it takes priority over the location's default shift. Lookup order: employee → location → null (no shift). |
| Break duration is a simple minute field | No break start/end tracking in v1. Just subtracted from shift duration for overtime calculation. |
| `attendance_records.shift_id` populated on clock-in | When an employee clocks in, the system resolves their applicable shift and stamps it on the record. Late detection runs immediately. Early departure + overtime run on clock-out. |

## Implementation Steps

### Step 1: Database Migration — Shifts Table & Assignments

Create the `shifts` and `shift_assignments` tables, add FK from `attendance_records`.

**Via:** Supabase migration

**Schema:**

```sql
-- Shift templates
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- e.g., "Day Shift", "Factory Shift"
  start_time TIME NOT NULL,                -- e.g., '07:00'
  end_time TIME NOT NULL,                  -- e.g., '17:00'
  break_duration_minutes INTEGER NOT NULL DEFAULT 60,
  grace_period_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shift assignments (per location or per employee)
CREATE TABLE public.shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,  -- NULL = ongoing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Either location or employee, not both
  CONSTRAINT assignment_target CHECK (
    (location_id IS NOT NULL AND employee_id IS NULL) OR
    (location_id IS NULL AND employee_id IS NOT NULL)
  ),
  -- No duplicate active assignments for same target
  CONSTRAINT unique_active_location_assignment
    UNIQUE NULLS NOT DISTINCT (shift_id, location_id, effective_from)
    WHERE (employee_id IS NULL),
  CONSTRAINT unique_active_employee_assignment
    UNIQUE NULLS NOT DISTINCT (shift_id, employee_id, effective_from)
    WHERE (location_id IS NULL)
);

-- Indexes
CREATE INDEX idx_shift_assignments_location ON public.shift_assignments (location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_shift_assignments_employee ON public.shift_assignments (employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_shift_assignments_effective ON public.shift_assignments (effective_from, effective_to);

-- Add FK from attendance_records to shifts
ALTER TABLE public.attendance_records
  ADD CONSTRAINT fk_attendance_shift
  FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE SET NULL;

-- Auto-update triggers
CREATE TRIGGER on_shifts_updated
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_shift_assignments_updated
  BEFORE UPDATE ON public.shift_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Helper: resolve applicable shift for an employee on a given date
-- Priority: employee-specific > location-based > NULL
CREATE OR REPLACE FUNCTION public.get_employee_shift(p_employee_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID AS $$
  SELECT sa.shift_id
  FROM public.shift_assignments sa
  WHERE (
    (sa.employee_id = p_employee_id)
    OR (sa.location_id = (SELECT primary_location_id FROM public.employees WHERE id = p_employee_id))
  )
  AND sa.effective_from <= p_date
  AND (sa.effective_to IS NULL OR sa.effective_to >= p_date)
  ORDER BY
    CASE WHEN sa.employee_id IS NOT NULL THEN 0 ELSE 1 END,  -- employee-specific first
    sa.effective_from DESC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

**Note on constraints:** The partial unique constraints may need to be implemented as partial unique indexes instead if Supabase's Postgres version doesn't support `UNIQUE ... WHERE`. Verify at execution time and adjust.

**Acceptance criteria:**
- `shifts` table created with name, start/end time, break, grace period
- `shift_assignments` table with location OR employee target (CHECK constraint)
- FK from `attendance_records.shift_id` to `shifts.id` established
- `get_employee_shift()` resolves the correct shift with employee > location priority

---

### Step 2: RLS Policies — Shifts & Assignments

**Via:** Supabase migration (same or chained)

```sql
-- Shifts: readable by all approved users, writable by admin/HR
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view shifts"
  ON public.shifts FOR SELECT
  USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Admin/HR can manage shifts"
  ON public.shifts FOR ALL
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'hr_officer')
    AND public.is_user_approved(auth.uid())
  );

-- Shift assignments: similar pattern
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view shift assignments"
  ON public.shift_assignments FOR SELECT
  USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Admin/HR can manage shift assignments"
  ON public.shift_assignments FOR ALL
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'hr_officer')
    AND public.is_user_approved(auth.uid())
  );
```

**Acceptance criteria:**
- All approved users can read shifts (needed for employee-facing shift display)
- Only admin/HR can create, update, delete shifts and assignments
- RLS enforced — unapproved users blocked

---

### Step 3: Seed Data — Default Shifts

Create at least 2 default shift templates matching real Kunoz operations.

**Via:** Supabase migration or seed SQL

```sql
-- Day Shift: typical office/site hours
INSERT INTO public.shifts (name, start_time, end_time, break_duration_minutes, grace_period_minutes)
VALUES ('Day Shift', '07:00', '17:00', 60, 15);

-- Factory Shift: tighter schedule
INSERT INTO public.shifts (name, start_time, end_time, break_duration_minutes, grace_period_minutes)
VALUES ('Factory Shift', '08:00', '16:00', 30, 5);

-- Night Shift: for operations that run late
INSERT INTO public.shifts (name, start_time, end_time, break_duration_minutes, grace_period_minutes)
VALUES ('Night Shift', '20:00', '06:00', 60, 10);
```

Then assign default shifts to locations (all 8 locations get "Day Shift" by default). Specific assignments can be adjusted by admin later.

**Acceptance criteria:**
- At least 2 shift templates exist (DoD requirement)
- All locations have a default shift assignment
- Night shift handles cross-midnight correctly (end_time < start_time)

---

### Step 4: TypeScript Types & Zod Validations

**File:** `src/lib/validations/shift.ts`

```typescript
import { z } from "zod";

// --- Zod Schemas ---

export const shiftSchema = z.object({
  name: z.string().min(1, "Shift name is required").max(100),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  break_duration_minutes: z.number().int().min(0).max(480).default(60),
  grace_period_minutes: z.number().int().min(0).max(120).default(15),
  is_active: z.boolean().default(true),
});

export type ShiftFormData = z.infer<typeof shiftSchema>;

export const shiftAssignmentSchema = z.object({
  shift_id: z.string().uuid("Invalid shift"),
  location_id: z.string().uuid("Invalid location").optional(),
  employee_id: z.string().uuid("Invalid employee").optional(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
  (data) => (data.location_id && !data.employee_id) || (!data.location_id && data.employee_id),
  { message: "Assign to either a location or an employee, not both" }
);

export type ShiftAssignmentFormData = z.infer<typeof shiftAssignmentSchema>;

// --- TypeScript Interfaces ---

export interface Shift {
  id: string;
  name: string;
  start_time: string; // "HH:MM:SS"
  end_time: string;
  break_duration_minutes: number;
  grace_period_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignment {
  id: string;
  shift_id: string;
  location_id: string | null;
  employee_id: string | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignmentWithDetails extends ShiftAssignment {
  shifts: { name: string; start_time: string; end_time: string } | null;
  locations: { name: string } | null;
  employees: { full_name: string; employee_number: string } | null;
}

// --- Shift Time Utilities ---

/**
 * Calculate shift duration in minutes (handles cross-midnight shifts).
 */
export function getShiftDurationMinutes(startTime: string, endTime: string, breakMinutes: number): number;

/**
 * Check if a clock-in time is late relative to shift start + grace period.
 */
export function isLateArrival(clockInTime: Date, shiftStartTime: string, graceMinutes: number): boolean;

/**
 * Check if a clock-out time is early departure.
 */
export function isEarlyDeparture(clockOutTime: Date, shiftEndTime: string): boolean;

/**
 * Calculate overtime minutes (worked beyond shift duration).
 */
export function calculateOvertime(totalMinutes: number, shiftDurationMinutes: number): number;
```

**Acceptance criteria:**
- Full type coverage for shifts and assignments
- Zod schemas validate all mutation inputs
- Time utility functions handle cross-midnight shifts correctly
- Shift assignment enforces either location OR employee (not both)

---

### Step 5: Shift Time Utility Functions

**File:** `src/lib/shifts/time-rules.ts`

Core logic for late/early/overtime detection. Pure functions, no DB dependency — testable in isolation.

```typescript
/**
 * Parse "HH:MM" or "HH:MM:SS" time string to minutes since midnight.
 */
export function timeToMinutes(time: string): number;

/**
 * Get shift net working minutes (handles cross-midnight).
 * Example: 07:00-17:00 with 60min break = 540 minutes
 * Example: 20:00-06:00 with 60min break = 540 minutes (cross-midnight)
 */
export function getShiftNetMinutes(
  startTime: string,
  endTime: string,
  breakMinutes: number
): number;

/**
 * Determine attendance status based on shift rules.
 * Called after clock-in and clock-out to update the record.
 *
 * Returns: { status, isOvertime, overtimeMinutes }
 */
export function evaluateAttendanceStatus(params: {
  clockIn: Date;
  clockOut: Date | null;
  shiftStartTime: string;
  shiftEndTime: string;
  graceMinutes: number;
  breakMinutes: number;
}): {
  status: 'present' | 'late' | 'early_departure';
  isOvertime: boolean;
  overtimeMinutes: number;
  totalMinutes: number | null;
};
```

**Key logic:**
- **Late arrival:** `clockIn` time-of-day > shift start + grace period → status = 'late'
- **Early departure:** `clockOut` time-of-day < shift end → status = 'early_departure'
- **Both late AND early:** status = 'late' (late takes priority as the initial infraction)
- **Overtime:** `totalMinutes > shiftNetMinutes` → `overtimeMinutes = totalMinutes - shiftNetMinutes`
- **Cross-midnight:** If `endTime < startTime`, shift spans midnight. Adjust calculations accordingly.

**Acceptance criteria:**
- `getShiftNetMinutes("07:00", "17:00", 60)` → 540
- `getShiftNetMinutes("20:00", "06:00", 60)` → 540 (cross-midnight)
- Late detection: clock-in at 7:20 with grace 15 → late. Clock-in at 7:14 → on time.
- Early departure: clock-out at 16:30 when shift ends 17:00 → early departure
- Overtime: worked 600 min on 540 min shift → 60 overtime minutes
- Edge: no clock-out yet → status based on clock-in only (late or present), overtime/total null

---

### Step 6: Server Actions — Shift Management

**File:** `src/actions/shifts.ts`

CRUD actions for admin/HR to manage shift templates and assignments.

**Actions:**

1. **`createShiftAction(data: ShiftFormData)`**
   - `requireRole('admin', 'hr_officer')`
   - Validate with `shiftSchema`
   - Insert into `shifts` table
   - Revalidate `/dashboard/shifts`

2. **`updateShiftAction(id: string, data: ShiftFormData)`**
   - `requireRole('admin', 'hr_officer')`
   - Validate shift exists, validate data
   - Update shifts record
   - Revalidate

3. **`deleteShiftAction(id: string)`**
   - `requireRole('admin', 'hr_officer')`
   - Check no active assignments exist (or cascade)
   - Set `is_active = false` (soft delete) rather than hard delete
   - Revalidate

4. **`getShiftsAction()`**
   - Return all shifts (active only by default)
   - Include assignment counts

5. **`assignShiftAction(data: ShiftAssignmentFormData)`**
   - `requireRole('admin', 'hr_officer')`
   - Validate with `shiftAssignmentSchema`
   - Insert into `shift_assignments`
   - Revalidate

6. **`removeShiftAssignmentAction(id: string)`**
   - `requireRole('admin', 'hr_officer')`
   - Delete assignment (or set effective_to = today)
   - Revalidate

7. **`getShiftAssignmentsAction(shiftId?: string)`**
   - Return assignments with details (location name or employee name)
   - Filter by shift if provided

**Acceptance criteria:**
- Admin can create shift templates (SHF-01)
- Admin can assign shifts to locations or employees (SHF-02)
- Validation prevents invalid time formats
- Soft delete preserves historical data
- All actions restricted to admin/HR

---

### Step 7: Integrate Shift Detection into Attendance Actions

**Files to modify:**
- `src/actions/attendance.ts` — Update `clockInAction` and `clockOutAction`

**Clock-in changes:**
1. After creating the attendance record, resolve the employee's applicable shift via `get_employee_shift()` SQL function (or TypeScript lookup)
2. Set `shift_id` on the attendance record
3. Evaluate late arrival: compare clock-in time against shift start + grace
4. If late → update `status = 'late'` on the record

**Clock-out changes:**
1. After updating clock-out, fetch the linked shift details
2. Evaluate early departure: compare clock-out time against shift end
3. Calculate `total_minutes` (already done in Phase 3)
4. Calculate overtime: if `total_minutes > shiftNetMinutes` → set `is_overtime = true`, compute `overtime_minutes`
5. If early departure AND not late → set `status = 'early_departure'`
6. If late AND early departure → keep `status = 'late'`
7. Update the attendance record with computed values

**Supervisor batch actions (also modify):**

`src/actions/supervisor.ts` — Update `batchClockInAction` and `batchClockOutAction`:

- **`batchClockInAction`:** For each employee being clocked in, resolve their applicable shift via `get_employee_shift()`. Set `shift_id` on each record. Evaluate late arrival per-employee (each may have a different assigned shift). Status = 'late' if clock-in time exceeds that employee's shift start + grace.
- **`batchClockOutAction`:** For each employee being clocked out, fetch the linked shift. Calculate `total_minutes`, evaluate early departure, and compute overtime. Update each record with computed values.

This ensures shift detection is consistent whether an employee clocks in themselves or a supervisor does it for them.

**Shared logic:** Extract the shift resolution + status evaluation into a reusable function (e.g., `resolveAndApplyShiftRules(employeeId, clockIn, clockOut?)` in `src/lib/shifts/time-rules.ts`) that both individual and batch actions call. This avoids duplicating the detection logic.

**No-shift fallback:** If no shift is assigned, keep Phase 3 behavior — status = 'present', no overtime detection. This is graceful degradation, not an error.

**Acceptance criteria:**
- Clock-in with assigned shift → `shift_id` populated, late detection runs (SHF-03)
- Clock-out with assigned shift → early departure detected (SHF-04), overtime calculated (SHF-05)
- Supervisor batch clock-in → each employee gets correct shift_id and late detection
- Supervisor batch clock-out → each employee gets early departure + overtime calculation
- No shift assigned → no error, status remains 'present'
- Status field accurately reflects time-rule evaluation

---

### Step 8: Shift Management UI — Admin Page

**Files:**
- `src/app/(dashboard)/dashboard/shifts/page.tsx` — Shifts management page
- `src/components/shifts/shift-list.tsx` — Table of shift templates
- `src/components/shifts/shift-form-dialog.tsx` — Create/edit shift dialog
- `src/components/shifts/shift-assignment-dialog.tsx` — Assign shift to location/employee

**Shift list page:**
- Table: Name, Start Time, End Time, Break, Grace Period, # Assignments, Actions
- "Create Shift" button → opens form dialog
- Inline edit/deactivate actions per row
- Status badge: Active (emerald) / Inactive (gray)

**Shift form dialog:**
- Fields: name, start time (time picker), end time (time picker), break duration, grace period, active toggle
- Zod validation on submit
- Create/Edit modes

**Assignment dialog:**
- Triggered from a shift row → "Assign to..."
- Toggle: Location / Employee
- If location: dropdown of all locations
- If employee: searchable employee dropdown
- Date range: effective_from (required), effective_to (optional)
- Shows existing assignments for this shift

**Design (per DESIGN.md):**
- Full-width table, no max-width cap
- Status badges: pill-shaped with color (emerald/amber/gray)
- Time values displayed in JetBrains Mono
- Card backgrounds: neutral-100
- Dialogs use shadcn/ui Dialog component

**Acceptance criteria:**
- Admin can create/edit/deactivate shift templates (SHF-01)
- Admin can assign shifts to locations or employees (SHF-02)
- Existing assignments visible per shift
- Grace period configurable per shift
- Form validation prevents invalid data

---

### Step 9: Shift Display on Attendance Records

**Files to modify:**
- `src/components/attendance/attendance-history.tsx` — Add shift column
- `src/components/attendance/supervisor-attendance.tsx` — Show shift info
- Dashboard components — Update status badge logic

**Changes:**
1. Attendance history table: Add "Shift" column showing shift name
2. Status badges now use full status set: present (emerald), late (amber), early departure (amber), absent (red), overtime indicator (purple)
3. Supervisor view: Show employee's assigned shift name + late/early flags
4. Dashboard stats: Update "total late" counters (no longer placeholder)

**Status badge mapping (per DESIGN.md):**
| Status | Color | Icon |
|--------|-------|------|
| Present (on time) | Emerald `#059669` | check circle |
| Late | Amber `#F59E0B` | clock |
| Early Departure | Amber `#F59E0B` | arrow-left |
| Overtime | Purple `#7C3AED` | timer (secondary badge) |

**Acceptance criteria:**
- Shift name visible on attendance records (SHF: "Shift info visible on attendance records")
- Late/early/overtime statuses display with correct colors
- Dashboard stats reflect real late/overtime counts
- Supervisor can see which employees are late at a glance

---

### Step 10: Navigation & Dashboard Updates

**Files to modify:**
- `src/components/layout/sidebar.tsx` — Add "Shifts" nav item for admin/HR
- `src/components/dashboard/admin-dashboard.tsx` — Add shift-related stats
- `src/components/dashboard/hr-dashboard.tsx` — Add shift-related stats

**Navigation:**
- "Shifts" link visible only to admin and hr_officer roles
- Route: `/dashboard/shifts`
- Icon: clock or calendar

**Dashboard updates:**
- Admin/HR dashboard: "Late Today" count, "Overtime This Week" summary
- These replace the placeholder values from Phase 3

**Acceptance criteria:**
- Shifts page accessible from sidebar for admin/HR only
- Dashboard stats include late/overtime figures
- Active state shows on current route

## Verification Checklist

- [ ] `npm run dev` starts clean, no TypeScript errors
- [ ] At least 2 shift templates exist (Day Shift, Factory Shift)
- [ ] Admin can create a new shift template with name, times, break, grace period
- [ ] Admin can assign a shift to a location
- [ ] Admin can assign a shift to a specific employee
- [ ] Employee clocks in at 7:20 on "Day Shift" (start 7:00, grace 15min) → marked "late"
- [ ] Employee clocks in at 7:10 on "Day Shift" → marked "present" (within grace)
- [ ] Employee clocks out at 16:00 on "Day Shift" (end 17:00) → marked "early_departure"
- [ ] Employee works 11 hours on 9-hour shift → 2 hours overtime calculated
- [ ] Cross-midnight shift (20:00-06:00) correctly calculates duration and overtime
- [ ] Supervisor batch clock-in → each employee gets correct shift_id and late status
- [ ] Supervisor batch clock-out → overtime calculated per employee
- [ ] No shift assigned → status stays "present", no errors
- [ ] Shift name visible on attendance history records
- [ ] Late/early status badges show correct colors (amber)
- [ ] Overtime badge shows purple
- [ ] Admin/HR dashboard shows real late/overtime counts
- [ ] Shifts page only accessible to admin/HR roles
- [ ] RLS enforced: employee cannot modify shifts
- [ ] `npx tsc --noEmit` passes

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Cross-midnight shifts break time calculations | All time functions handle wrap-around (endTime < startTime). Test with 20:00-06:00 shift explicitly. |
| Shift assignment conflicts (employee has shift via location AND direct) | Priority rule: employee-specific > location-based. `get_employee_shift()` uses ORDER BY to resolve. |
| Late detection runs before shift exists | Graceful degradation: if no shift found, skip detection. Status stays 'present'. No error thrown. |
| Grace period confusion for users | Show grace period on shift card. On late arrival, show "Late by X minutes (grace: Y min)" in UI. |
| Historical records if shift changes | `shift_id` on attendance_records is the shift at time of clock-in. Changing the shift template doesn't retroactively change past records. |
| Partial unique constraints not supported | Implement as partial unique indexes instead of constraint syntax. Verify at execution time. |

## Execution Waves

| Wave | Steps | Agents | Notes |
|------|-------|--------|-------|
| 1 | Step 1 (shifts table) + Step 2 (RLS) + Step 3 (seed) | backend | Sequential SQL migrations |
| 2 | Step 4 (types/zod) + Step 5 (time-rules utility) | backend x2 | Independent, can parallelize |
| 3 | Step 6 (shift CRUD actions) + Step 7 (attendance + supervisor integration) | backend x2 | Step 7 depends on Step 5 logic, Step 6 depends on Step 4 types. Step 7 modifies both attendance.ts AND supervisor.ts. Can parallelize 6 and 7 since they import from different modules. |
| 4 | Step 8 (shift management UI) + Step 9 (attendance display) | frontend x2 | Both depend on server actions. Can parallelize. |
| 5 | Step 10 (nav + dashboard) | frontend | Final wiring, depends on all above |

## Requirement Coverage

| Req | Description | Delivering Steps | Coverage |
|-----|-------------|-----------------|----------|
| SHF-01 | Admin/HR can define shift templates (name, start, end, break) | Steps 1, 4, 6, 8 | Full |
| SHF-02 | Shifts assigned per location or per employee | Steps 1, 6, 8 | Full |
| SHF-03 | Auto-detect late arrival (configurable grace period) | Steps 5, 7 | Full |
| SHF-04 | Auto-detect early departure | Steps 5, 7 | Full |
| SHF-05 | Overtime calculated when hours exceed shift duration | Steps 5, 7 | Full |

**All 5 requirements fully covered. No deferrals.**

---
*Plan created: 2026-03-31*
