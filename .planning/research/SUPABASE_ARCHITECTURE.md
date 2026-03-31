# Supabase Architecture: Kunoz Workforce Attendance System

**Domain:** Workforce attendance & time-tracking for Saudi construction company
**Researched:** 2026-03-31
**Overall confidence:** HIGH (verified against official Supabase docs, real data from client Excel)

---

## Table of Contents

1. [Data Analysis — Current State](#1-data-analysis--current-state)
2. [Database Schema Design](#2-database-schema-design)
3. [Role-Based Access Control (RBAC)](#3-role-based-access-control-rbac)
4. [Row Level Security (RLS) Policies](#4-row-level-security-rls-policies)
5. [Supabase Auth Patterns](#5-supabase-auth-patterns)
6. [Real-time Features](#6-real-time-features)
7. [Edge Functions](#7-edge-functions)
8. [Geofence Validation with PostGIS](#8-geofence-validation-with-postgis)
9. [Scheduled Jobs (pg_cron)](#9-scheduled-jobs-pg_cron)
10. [Audit Trail](#10-audit-trail)
11. [Data Seeding Strategy](#11-data-seeding-strategy)
12. [Pitfalls & Warnings](#12-pitfalls--warnings)

---

## 1. Data Analysis — Current State

**Source:** `locations and Employees (1).xlsx` — single sheet with locations and employees.

### Locations (8 sites)

| Name | City | Notes |
|------|------|-------|
| Head Office | Riyadh | Administrative hub |
| Factory 1 | Riyadh | 21 employees (largest site) |
| Factory 2 | Mecca | 16 employees |
| Spark Project | Al Ehsaa | 5 employees |
| Rukn AL Manar Project | AL Damam | 1 employee (data incomplete?) |
| Mohrkey Project | Al Qaseem | 7 employees |
| Masar Mecca Project | Mecca | 6 employees |
| JYC Project | Jeddah | 3 employees |

Google Maps links are provided for each location — these will be used to extract GPS coordinates for geofencing.

### Employees (66 total)

**By Position:**

| Position | Count | System Role Mapping |
|----------|-------|---------------------|
| Labor | 37 | `employee` |
| Supervisor | 7 | `supervisor` |
| Head Of Department | 6 | `supervisor` or `manager` |
| HR Officer / HR officer | 4 | `hr_officer` |
| HR Manager | 1 | `hr_officer` (elevated) |
| Site Engineer | 2 | `employee` |
| Accountant | 2 | `employee` |
| Coordinator | 2 | `employee` |
| Driver | 2 | `employee` |
| Architect | 1 | `employee` |
| Regional Manager | 1 | `admin` |
| Factory Manager | 1 | `admin` or `supervisor` |

**Observations:**
- Position names have inconsistent casing: "HR officer" vs "HR Officer" — normalize during import.
- "Rukn AL manar" has only 1 employee listed — likely incomplete data.
- Laborers are 56% of workforce — they need the simplest possible check-in experience.
- 7 supervisors across 8 sites — some sites may share supervisors.
- 4 HR officers spread across Factory 1, Factory 2; HR Manager at Head Office.

---

## 2. Database Schema Design

### Design Principles

1. **`auth.users` is the identity source** — never duplicate auth data.
2. **`profiles` table extends `auth.users`** — linked via `auth.uid()`.
3. **All tables use `uuid` primary keys** — matches Supabase conventions.
4. **`timestamptz` for all timestamps** — Saudi Arabia is UTC+3, but store in UTC.
5. **Soft deletes where appropriate** — `deleted_at` on employees, never hard delete attendance records.
6. **JSONB for flexible metadata** — device info on check-ins, modification reasons on audit.

### Core Schema

```sql
-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'hr_officer', 'supervisor', 'employee');
CREATE TYPE public.attendance_status AS ENUM ('present', 'late', 'absent', 'on_leave', 'excused');
CREATE TYPE public.leave_type AS ENUM ('annual', 'sick', 'emergency', 'unpaid');
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.check_method AS ENUM ('geofence', 'manual_admin', 'manual_supervisor', 'qr_code');

-- =============================================================
-- EXTENSIONS
-- =============================================================

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =============================================================
-- LOCATIONS
-- =============================================================

CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,                              -- Arabic name
  city TEXT NOT NULL,
  coordinates GEOGRAPHY(POINT) NOT NULL,     -- PostGIS point for geofencing
  geofence_radius_meters INT NOT NULL DEFAULT 200,  -- check-in radius
  maps_url TEXT,                             -- Google Maps link (from Excel)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX locations_geo_idx ON public.locations USING GIST (coordinates);

-- =============================================================
-- PROFILES (extends auth.users)
-- =============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,                         -- Arabic name
  phone TEXT,
  national_id TEXT,                          -- Saudi Iqama/National ID
  role app_role NOT NULL DEFAULT 'employee',
  position TEXT,                             -- job title from Excel
  primary_location_id UUID REFERENCES public.locations(id),
  hire_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX profiles_role_idx ON public.profiles(role);
CREATE INDEX profiles_location_idx ON public.profiles(primary_location_id);

-- =============================================================
-- LOCATION ASSIGNMENTS (many-to-many: employees can be at multiple sites)
-- =============================================================

CREATE TABLE public.location_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  UNIQUE(profile_id, location_id)
);

CREATE INDEX la_profile_idx ON public.location_assignments(profile_id);
CREATE INDEX la_location_idx ON public.location_assignments(location_id);

-- =============================================================
-- SHIFTS
-- =============================================================

CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                         -- e.g., "Morning", "Evening"
  location_id UUID NOT NULL REFERENCES public.locations(id),
  start_time TIME NOT NULL,                   -- e.g., 07:00
  end_time TIME NOT NULL,                     -- e.g., 16:00
  late_threshold_minutes INT NOT NULL DEFAULT 15,  -- minutes after start_time = "late"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- SHIFT ASSIGNMENTS (which employees work which shifts)
-- =============================================================

CREATE TABLE public.shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,                      -- NULL = indefinite
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, shift_id, effective_from)
);

-- =============================================================
-- ATTENDANCE RECORDS (the core table)
-- =============================================================

CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  shift_id UUID REFERENCES public.shifts(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Check-in/out
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  check_in_method check_method,
  check_out_method check_method,

  -- Location verification
  check_in_coordinates GEOGRAPHY(POINT),     -- where the employee actually was
  check_out_coordinates GEOGRAPHY(POINT),
  check_in_distance_meters FLOAT,            -- distance from site center
  check_out_distance_meters FLOAT,

  -- Status
  status attendance_status NOT NULL DEFAULT 'absent',
  late_minutes INT DEFAULT 0,

  -- Overtime
  overtime_minutes INT DEFAULT 0,
  overtime_approved BOOLEAN DEFAULT false,
  overtime_approved_by UUID REFERENCES public.profiles(id),

  -- Metadata
  notes TEXT,
  device_info JSONB,                         -- user agent, device model, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(profile_id, date)                   -- one record per employee per day
);

CREATE INDEX ar_profile_date_idx ON public.attendance_records(profile_id, date DESC);
CREATE INDEX ar_location_date_idx ON public.attendance_records(location_id, date DESC);
CREATE INDEX ar_status_idx ON public.attendance_records(status);
CREATE INDEX ar_date_idx ON public.attendance_records(date DESC);

-- =============================================================
-- LEAVE REQUESTS
-- =============================================================

CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status leave_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX lr_profile_idx ON public.leave_requests(profile_id);
CREATE INDEX lr_status_idx ON public.leave_requests(status);

-- =============================================================
-- REPORTS (generated summaries)
-- =============================================================

CREATE TABLE public.attendance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,                  -- 'daily_site', 'weekly_employee', 'monthly_summary'
  location_id UUID REFERENCES public.locations(id),  -- NULL for company-wide
  profile_id UUID REFERENCES public.profiles(id),    -- NULL for site-wide
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Summary data
  total_employees INT,
  days_present INT,
  days_absent INT,
  days_late INT,
  total_overtime_minutes INT,
  attendance_rate NUMERIC(5,2),              -- percentage

  -- Full report data
  report_data JSONB NOT NULL,                -- detailed breakdown

  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES public.profiles(id)   -- NULL for auto-generated
);

CREATE INDEX reports_type_period_idx ON public.attendance_reports(report_type, period_start DESC);

-- =============================================================
-- NOTIFICATIONS
-- =============================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,                         -- 'late_arrival', 'leave_approved', 'overtime_alert'
  data JSONB,                                -- additional context
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_recipient_idx ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications(recipient_id) WHERE read_at IS NULL;

-- =============================================================
-- HELPER: Updated_at trigger
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

### Entity Relationship Summary

```
auth.users (1) ──── (1) profiles
profiles   (M) ──── (M) locations        [via location_assignments]
profiles   (M) ──── (M) shifts           [via shift_assignments]
profiles   (1) ──── (N) attendance_records
profiles   (1) ──── (N) leave_requests
profiles   (1) ──── (N) notifications
locations  (1) ──── (N) attendance_records
locations  (1) ──── (N) shifts
locations  (1) ──── (N) attendance_reports
```

---

## 3. Role-Based Access Control (RBAC)

### Role Hierarchy

```
admin (full access — company owner, regional manager)
  └── hr_officer (all employees, all sites they're assigned to, manage leaves)
       └── supervisor (their site's employees only, approve daily attendance)
            └── employee (own data only, check-in/out)
```

### Permission Matrix

| Resource | admin | hr_officer | supervisor | employee |
|----------|-------|------------|------------|----------|
| **Locations** | CRUD | Read all | Read assigned | Read assigned |
| **Profiles** | CRUD all | Read/Update all | Read site employees | Read/Update own |
| **Attendance Records** | CRUD all | Read all, Update all | Read/Update site | Read own, Create own |
| **Leave Requests** | CRUD all | CRUD all | Read/Approve site | Create/Read own |
| **Reports** | Read all, Generate | Read all, Generate | Read site | Read own summary |
| **Shifts** | CRUD | CRUD | Read site | Read own |
| **Notifications** | Send to all | Send to all | Send to site | Read own |

### RBAC Implementation — Custom Access Token Hook

Use Supabase's Custom Access Token Hook to embed the role into the JWT. This avoids a database lookup on every RLS policy check.

```sql
-- =============================================================
-- RBAC: Permissions table
-- =============================================================

CREATE TYPE public.app_permission AS ENUM (
  'profiles.read.all',
  'profiles.read.site',
  'profiles.read.own',
  'profiles.update.all',
  'profiles.update.own',
  'attendance.read.all',
  'attendance.read.site',
  'attendance.read.own',
  'attendance.create.own',
  'attendance.update.all',
  'attendance.update.site',
  'leave.read.all',
  'leave.read.site',
  'leave.read.own',
  'leave.create.own',
  'leave.approve.all',
  'leave.approve.site',
  'reports.read.all',
  'reports.read.site',
  'reports.read.own',
  'reports.generate',
  'locations.manage',
  'shifts.manage',
  'notifications.send'
);

CREATE TABLE public.role_permissions (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  role app_role NOT NULL,
  permission app_permission NOT NULL,
  UNIQUE(role, permission)
);

-- Seed permissions
INSERT INTO public.role_permissions (role, permission) VALUES
  -- Admin: everything
  ('admin', 'profiles.read.all'),
  ('admin', 'profiles.update.all'),
  ('admin', 'attendance.read.all'),
  ('admin', 'attendance.create.own'),
  ('admin', 'attendance.update.all'),
  ('admin', 'leave.read.all'),
  ('admin', 'leave.create.own'),
  ('admin', 'leave.approve.all'),
  ('admin', 'reports.read.all'),
  ('admin', 'reports.generate'),
  ('admin', 'locations.manage'),
  ('admin', 'shifts.manage'),
  ('admin', 'notifications.send'),

  -- HR Officer
  ('hr_officer', 'profiles.read.all'),
  ('hr_officer', 'profiles.update.all'),
  ('hr_officer', 'attendance.read.all'),
  ('hr_officer', 'attendance.create.own'),
  ('hr_officer', 'attendance.update.all'),
  ('hr_officer', 'leave.read.all'),
  ('hr_officer', 'leave.create.own'),
  ('hr_officer', 'leave.approve.all'),
  ('hr_officer', 'reports.read.all'),
  ('hr_officer', 'reports.generate'),
  ('hr_officer', 'shifts.manage'),
  ('hr_officer', 'notifications.send'),

  -- Supervisor
  ('supervisor', 'profiles.read.site'),
  ('supervisor', 'attendance.read.site'),
  ('supervisor', 'attendance.create.own'),
  ('supervisor', 'attendance.update.site'),
  ('supervisor', 'leave.read.site'),
  ('supervisor', 'leave.create.own'),
  ('supervisor', 'leave.approve.site'),
  ('supervisor', 'reports.read.site'),

  -- Employee
  ('employee', 'profiles.read.own'),
  ('employee', 'profiles.update.own'),
  ('employee', 'attendance.read.own'),
  ('employee', 'attendance.create.own'),
  ('employee', 'leave.read.own'),
  ('employee', 'leave.create.own'),
  ('employee', 'reports.read.own');

-- =============================================================
-- Custom Access Token Hook — embeds role + location into JWT
-- =============================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims JSONB;
  user_role public.app_role;
  user_location_id UUID;
BEGIN
  -- Fetch user's role and primary location
  SELECT role, primary_location_id
  INTO user_role, user_location_id
  FROM public.profiles
  WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"employee"');
  END IF;

  IF user_location_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_location_id}', to_jsonb(user_location_id));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Security: only auth system can call this
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Grant read on profiles to the auth admin so the hook can query it
GRANT SELECT ON public.profiles TO supabase_auth_admin;

-- =============================================================
-- Authorization helper — reads role from JWT
-- =============================================================

CREATE OR REPLACE FUNCTION public.authorize(requested_permission app_permission)
RETURNS BOOLEAN AS $$
DECLARE
  bind_permissions INT;
  user_role public.app_role;
BEGIN
  SELECT (auth.jwt() ->> 'user_role')::public.app_role INTO user_role;

  SELECT count(*) INTO bind_permissions
  FROM public.role_permissions
  WHERE role_permissions.permission = requested_permission
    AND role_permissions.role = user_role;

  RETURN bind_permissions > 0;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- =============================================================
-- Helper: check if user is at same site as target employee
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_same_site(target_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.location_assignments my_sites
    JOIN public.location_assignments their_sites
      ON my_sites.location_id = their_sites.location_id
    WHERE my_sites.profile_id = auth.uid()
      AND their_sites.profile_id = target_profile_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';
```

**Confidence:** HIGH — based on [official Supabase RBAC documentation](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) and [Custom Access Token Hook docs](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook).

---

## 4. Row Level Security (RLS) Policies

### Critical RLS Rule
**RLS must be enabled on every table. No exceptions.** When RLS is enabled with no policies, all queries return zero rows — this is the safe default.

### Performance Rule
**Always index columns used in RLS policy conditions.** Missing indexes are the top RLS performance killer. The indexes defined above cover `profile_id`, `location_id`, `role`, and `date`.

### Policies

```sql
-- =============================================================
-- PROFILES — RLS
-- =============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admin/HR can read all profiles
CREATE POLICY "Admin/HR can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT authorize('profiles.read.all')));

-- Supervisor can read profiles at their site
CREATE POLICY "Supervisor can read site profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    (SELECT authorize('profiles.read.site'))
    AND is_same_site(id)
  );

-- Users can update their own profile (limited fields via API)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin/HR can update any profile
CREATE POLICY "Admin/HR can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT authorize('profiles.update.all')))
  WITH CHECK ((SELECT authorize('profiles.update.all')));

-- Only admin can insert/delete profiles (via admin API)
CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT (auth.jwt() ->> 'user_role')) = 'admin');

-- =============================================================
-- ATTENDANCE_RECORDS — RLS
-- =============================================================

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Employees see their own records
CREATE POLICY "Users can read own attendance"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- Admin/HR see all records
CREATE POLICY "Admin/HR can read all attendance"
  ON public.attendance_records FOR SELECT TO authenticated
  USING ((SELECT authorize('attendance.read.all')));

-- Supervisor sees site records
CREATE POLICY "Supervisor can read site attendance"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (
    (SELECT authorize('attendance.read.site'))
    AND location_id IN (
      SELECT location_id FROM public.location_assignments
      WHERE profile_id = auth.uid()
    )
  );

-- Employees can create their own check-in (one per day enforced by UNIQUE)
CREATE POLICY "Users can create own attendance"
  ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Supervisor can update site attendance (mark manual check-ins)
CREATE POLICY "Supervisor can update site attendance"
  ON public.attendance_records FOR UPDATE TO authenticated
  USING (
    (SELECT authorize('attendance.update.site'))
    AND location_id IN (
      SELECT location_id FROM public.location_assignments
      WHERE profile_id = auth.uid()
    )
  );

-- Admin/HR can update any record
CREATE POLICY "Admin/HR can update all attendance"
  ON public.attendance_records FOR UPDATE TO authenticated
  USING ((SELECT authorize('attendance.update.all')));

-- =============================================================
-- LEAVE_REQUESTS — RLS
-- =============================================================

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own leave requests"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admin/HR can read all leave requests"
  ON public.leave_requests FOR SELECT TO authenticated
  USING ((SELECT authorize('leave.read.all')));

CREATE POLICY "Supervisor can read site leave requests"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (
    (SELECT authorize('leave.read.site'))
    AND is_same_site(profile_id)
  );

CREATE POLICY "Users can create own leave requests"
  ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admin/HR can update any leave request"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING ((SELECT authorize('leave.approve.all')));

CREATE POLICY "Supervisor can approve site leave requests"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING (
    (SELECT authorize('leave.approve.site'))
    AND is_same_site(profile_id)
  );

-- =============================================================
-- LOCATIONS — RLS
-- =============================================================

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read locations they're assigned to
CREATE POLICY "Users can read assigned locations"
  ON public.locations FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT location_id FROM public.location_assignments
      WHERE profile_id = auth.uid()
    )
  );

-- Admin/HR can read all locations
CREATE POLICY "Admin/HR can read all locations"
  ON public.locations FOR SELECT TO authenticated
  USING (
    (SELECT (auth.jwt() ->> 'user_role')) IN ('admin', 'hr_officer')
  );

-- Only admin can modify locations
CREATE POLICY "Admin can manage locations"
  ON public.locations FOR ALL TO authenticated
  USING ((SELECT authorize('locations.manage')))
  WITH CHECK ((SELECT authorize('locations.manage')));

-- =============================================================
-- NOTIFICATIONS — RLS
-- =============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Admin/HR/Supervisor can create notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT (auth.jwt() ->> 'user_role')) IN ('admin', 'hr_officer', 'supervisor')
  );
```

**Confidence:** HIGH — pattern follows [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) and [MakerKit production patterns](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices).

### Performance Warning

The `is_same_site()` function uses a join. For 66 employees and 8 locations this is negligible, but if the company grows 10x, add a materialized view or denormalize `location_id` onto profiles. Monitor with `EXPLAIN ANALYZE` once in production.

---

## 5. Supabase Auth Patterns

### Registration Flow

**Recommended approach:** Admin-invited registration (not open self-registration).

Construction companies need controlled onboarding. An employee should not be able to sign up and assign themselves the `admin` role.

```
1. Admin creates employee profile in dashboard
2. System sends invite email via supabase.auth.admin.inviteUserByEmail()
3. Employee clicks link, sets password
4. Custom Access Token Hook injects role into JWT
5. Employee can now check in
```

### Implementation

```typescript
// Server-side only (Next.js API route or Server Action)
// Uses service_role key — NEVER expose client-side

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // server-side ONLY
)

async function inviteEmployee(email: string, fullName: string, role: app_role, locationId: string) {
  // 1. Create the auth user with invite
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },  // stored in user_metadata
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/setup-password`
  })

  if (authError) throw authError

  // 2. Create the profile (trigger can also do this)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authData.user.id,
      full_name: fullName,
      role,
      primary_location_id: locationId,
    })

  if (profileError) throw profileError

  // 3. Create location assignment
  const { error: assignError } = await supabaseAdmin
    .from('location_assignments')
    .insert({
      profile_id: authData.user.id,
      location_id: locationId,
      is_primary: true,
    })

  if (assignError) throw assignError

  return authData.user
}
```

### Alternative: Database Trigger on Auth User Creation

```sql
-- Auto-create profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### JWT Role Refresh After Role Changes

**Problem:** When an admin changes a user's role, the JWT still contains the old role until the token refreshes (default: 1 hour).

**Solution:** Force a session refresh on the client when the role changes.

```typescript
// Client-side: listen for role changes via Realtime
const channel = supabase
  .channel('role-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'profiles',
    filter: `id=eq.${currentUser.id}`,
  }, async (payload) => {
    if (payload.new.role !== payload.old.role) {
      // Force token refresh to get new JWT with updated role
      await supabase.auth.refreshSession()
    }
  })
  .subscribe()
```

**Confidence:** HIGH — verified with [Custom Access Token Hook docs](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) and [JWT claims reference](https://supabase.com/docs/guides/auth/jwt-fields).

---

## 6. Real-time Features

### Enable Realtime on Tables

```sql
-- Enable realtime for specific tables (not all — be selective for performance)
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
```

### Live Attendance Dashboard

The dashboard should show real-time check-ins for a site. Use the **Broadcast method** (recommended by Supabase for scalability and security).

```typescript
// Admin/Supervisor dashboard — live attendance feed
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LiveAttendanceFeed({ locationId }: { locationId: string }) {
  const supabase = createClient()
  const [records, setRecords] = useState<AttendanceRecord[]>([])

  useEffect(() => {
    // Initial fetch
    fetchTodayRecords()

    // Subscribe to new check-ins at this location
    const channel = supabase
      .channel(`attendance:${locationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'attendance_records',
        filter: `location_id=eq.${locationId}`,
      }, (payload) => {
        setRecords(prev => [payload.new as AttendanceRecord, ...prev])
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'attendance_records',
        filter: `location_id=eq.${locationId}`,
      }, (payload) => {
        setRecords(prev => prev.map(r =>
          r.id === payload.new.id ? payload.new as AttendanceRecord : r
        ))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [locationId])

  // ... render
}
```

### Late Arrival Notifications

Use a database trigger that fires when attendance is inserted with `status = 'late'`:

```sql
CREATE OR REPLACE FUNCTION public.notify_late_arrival()
RETURNS TRIGGER AS $$
DECLARE
  supervisor_ids UUID[];
BEGIN
  IF NEW.status = 'late' THEN
    -- Find supervisors at this location
    SELECT ARRAY_AGG(p.id)
    INTO supervisor_ids
    FROM public.profiles p
    JOIN public.location_assignments la ON la.profile_id = p.id
    WHERE la.location_id = NEW.location_id
      AND p.role IN ('supervisor', 'hr_officer', 'admin');

    -- Create notifications for each supervisor
    INSERT INTO public.notifications (recipient_id, title, body, type, data)
    SELECT
      unnest(supervisor_ids),
      'Late Arrival',
      (SELECT full_name FROM public.profiles WHERE id = NEW.profile_id) ||
        ' checked in ' || NEW.late_minutes || ' minutes late',
      'late_arrival',
      jsonb_build_object(
        'attendance_id', NEW.id,
        'profile_id', NEW.profile_id,
        'late_minutes', NEW.late_minutes,
        'location_id', NEW.location_id
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_late_arrival
  AFTER INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW
  WHEN (NEW.status = 'late')
  EXECUTE FUNCTION public.notify_late_arrival();
```

### Site Status Summary (Presence-style)

Use Supabase Realtime Presence to show which supervisors/admins are viewing a site dashboard:

```typescript
const channel = supabase.channel(`site:${locationId}`, {
  config: { presence: { key: currentUser.id } }
})

channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState()
  // Show who's watching: "3 supervisors viewing"
})

channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await channel.track({
      user_id: currentUser.id,
      name: currentUser.full_name,
      role: currentUser.role
    })
  }
})
```

**Confidence:** HIGH — verified with [Supabase Realtime docs](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) and [Next.js Realtime guide](https://supabase.com/docs/guides/realtime/realtime-with-nextjs).

---

## 7. Edge Functions

### 7.1 Geofence Check-in Validation

This is the most critical Edge Function. When an employee checks in, validate their GPS coordinates against the site's geofence before recording attendance.

```typescript
// supabase/functions/check-in/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get the user from the Authorization header
  const authHeader = req.headers.get('Authorization')
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader?.replace('Bearer ', '')
  )
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { latitude, longitude, location_id } = await req.json()

  // Validate geofence using PostGIS RPC
  const { data: geofenceCheck, error: geoError } = await supabase.rpc(
    'validate_geofence_check_in',
    {
      p_user_lat: latitude,
      p_user_long: longitude,
      p_location_id: location_id,
    }
  )

  if (geoError) {
    return new Response(JSON.stringify({ error: 'Geofence check failed' }), { status: 500 })
  }

  if (!geofenceCheck.is_within_fence) {
    return new Response(JSON.stringify({
      error: 'Outside geofence',
      distance_meters: geofenceCheck.distance_meters,
      allowed_radius: geofenceCheck.geofence_radius,
    }), { status: 403 })
  }

  // Determine status based on shift timing
  const { data: shift } = await supabase
    .from('shift_assignments')
    .select('shift:shifts(*)')
    .eq('profile_id', user.id)
    .lte('effective_from', new Date().toISOString().split('T')[0])
    .or(`effective_until.is.null,effective_until.gte.${new Date().toISOString().split('T')[0]}`)
    .single()

  const now = new Date()
  let status = 'present'
  let lateMinutes = 0

  if (shift?.shift) {
    const [shiftHour, shiftMin] = shift.shift.start_time.split(':').map(Number)
    const shiftStart = new Date(now)
    shiftStart.setHours(shiftHour, shiftMin, 0, 0)

    const diffMs = now.getTime() - shiftStart.getTime()
    lateMinutes = Math.max(0, Math.floor(diffMs / 60000))

    if (lateMinutes > shift.shift.late_threshold_minutes) {
      status = 'late'
    }
  }

  // Create attendance record
  const { data: record, error: insertError } = await supabase
    .from('attendance_records')
    .upsert({
      profile_id: user.id,
      location_id: location_id,
      shift_id: shift?.shift?.id,
      date: new Date().toISOString().split('T')[0],
      check_in_at: now.toISOString(),
      check_in_method: 'geofence',
      check_in_coordinates: `POINT(${longitude} ${latitude})`,
      check_in_distance_meters: geofenceCheck.distance_meters,
      status,
      late_minutes: lateMinutes,
      device_info: { user_agent: req.headers.get('User-Agent') },
    }, { onConflict: 'profile_id,date' })
    .select()
    .single()

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500 })
  }

  return new Response(JSON.stringify({
    success: true,
    record,
    distance_meters: geofenceCheck.distance_meters
  }), { status: 200 })
})
```

### PostGIS Geofence Validation Function

```sql
CREATE OR REPLACE FUNCTION public.validate_geofence_check_in(
  p_user_lat FLOAT,
  p_user_long FLOAT,
  p_location_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_distance FLOAT;
  v_radius INT;
  v_location_name TEXT;
BEGIN
  SELECT
    extensions.ST_Distance(
      coordinates,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_user_long, p_user_lat), 4326)::extensions.geography
    ),
    geofence_radius_meters,
    name
  INTO v_distance, v_radius, v_location_name
  FROM public.locations
  WHERE id = p_location_id;

  IF v_radius IS NULL THEN
    RETURN jsonb_build_object('error', 'Location not found');
  END IF;

  RETURN jsonb_build_object(
    'is_within_fence', v_distance <= v_radius,
    'distance_meters', ROUND(v_distance::NUMERIC, 1),
    'geofence_radius', v_radius,
    'location_name', v_location_name
  );
END;
$$;
```

### 7.2 SMS Notifications via Telnyx

```typescript
// supabase/functions/send-sms/index.ts
Deno.serve(async (req: Request) => {
  const { phone, message } = await req.json()

  const response = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('TELNYX_API_KEY')}`,
    },
    body: JSON.stringify({
      from: Deno.env.get('TELNYX_PHONE_NUMBER'),  // Saudi number
      to: phone,
      text: message,
    }),
  })

  const data = await response.json()
  return new Response(JSON.stringify(data), {
    status: response.ok ? 200 : 500
  })
})
```

### 7.3 Report Generation

```typescript
// supabase/functions/generate-report/index.ts
// Called by pg_cron on schedule or on-demand by admin/HR
Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { report_type, location_id, period_start, period_end } = await req.json()

  // Fetch attendance data for the period
  let query = supabase
    .from('attendance_records')
    .select('*, profiles(full_name, position), locations(name)')
    .gte('date', period_start)
    .lte('date', period_end)

  if (location_id) {
    query = query.eq('location_id', location_id)
  }

  const { data: records, error } = await query

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  // Calculate summary stats
  const summary = {
    total_employees: new Set(records.map(r => r.profile_id)).size,
    days_present: records.filter(r => r.status === 'present').length,
    days_absent: records.filter(r => r.status === 'absent').length,
    days_late: records.filter(r => r.status === 'late').length,
    total_overtime_minutes: records.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0),
    attendance_rate: 0,
  }

  const totalPossible = summary.total_employees * /* working days */ 1
  summary.attendance_rate = totalPossible > 0
    ? ((summary.days_present + summary.days_late) / totalPossible * 100)
    : 0

  // Store report
  const { data: report } = await supabase
    .from('attendance_reports')
    .insert({
      report_type,
      location_id,
      period_start,
      period_end,
      ...summary,
      report_data: { records, summary },
    })
    .select()
    .single()

  return new Response(JSON.stringify(report), { status: 200 })
})
```

**Confidence:** HIGH for Edge Functions architecture — verified with [Supabase Edge Functions docs](https://supabase.com/docs/guides/functions). MEDIUM for Telnyx integration — no official Supabase+Telnyx guide exists, but all building blocks are verified independently ([Telnyx API](https://telnyx.com/resources/integrating-sms-into-unified-communications-platforms), [Supabase Edge Functions](https://supabase.com/docs/guides/functions)).

---

## 8. Geofence Validation with PostGIS

### Setup

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- The locations table already has GEOGRAPHY(POINT) column and GIST index
-- (defined in schema above)
```

### Extracting Coordinates from Google Maps URLs

The Excel provides Google Maps short URLs for each location. During seeding, these need to be resolved to actual coordinates. Approach:

1. **Manual extraction** (recommended for 8 locations): Open each URL, copy lat/lng from the URL bar.
2. **Script extraction**: Use the Google Maps Geocoding API or resolve the short URLs.

Example coordinates to seed:

```sql
-- These are approximate — extract actual coordinates from the Google Maps URLs
UPDATE public.locations SET coordinates = ST_SetSRID(ST_MakePoint(46.6753, 24.7136), 4326)::geography
WHERE name = 'Head Office';
-- Riyadh coordinates: ~24.7136, 46.6753

UPDATE public.locations SET coordinates = ST_SetSRID(ST_MakePoint(39.8579, 21.3891), 4326)::geography
WHERE name = 'Factory 2';
-- Mecca coordinates: ~21.3891, 39.8579
```

### Geofence Radius Recommendations

| Site Type | Recommended Radius | Rationale |
|-----------|-------------------|-----------|
| Head Office | 100m | Small building, GPS is precise enough |
| Factory 1 & 2 | 200-300m | Larger compound, employees may be in different areas |
| Construction Projects | 300-500m | Large sites, GPS less reliable in open terrain |

These should be configurable per-location in the admin dashboard.

**Confidence:** HIGH — [PostGIS documentation on Supabase](https://supabase.com/docs/guides/database/extensions/postgis) directly covers this pattern.

---

## 9. Scheduled Jobs (pg_cron)

### Daily Absent Marking

Run at end of each workday — any employee without a check-in gets marked absent.

```sql
SELECT cron.schedule(
  'mark-absent-employees',
  '0 18 * * 0-4',  -- 6 PM, Sunday-Thursday (Saudi work week)
  $$
  INSERT INTO public.attendance_records (profile_id, location_id, date, status)
  SELECT
    p.id,
    p.primary_location_id,
    CURRENT_DATE,
    'absent'
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.role = 'employee'
    AND NOT EXISTS (
      SELECT 1 FROM public.attendance_records ar
      WHERE ar.profile_id = p.id AND ar.date = CURRENT_DATE
    )
  ON CONFLICT (profile_id, date) DO NOTHING;
  $$
);
```

### Weekly Overtime Calculation

```sql
SELECT cron.schedule(
  'weekly-overtime-calc',
  '0 20 * * 4',  -- Thursday 8 PM (end of Saudi work week)
  $$
  UPDATE public.attendance_records ar
  SET overtime_minutes = GREATEST(0,
    EXTRACT(EPOCH FROM (ar.check_out_at - ar.check_in_at)) / 60
    - (
      SELECT EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 60
      FROM public.shifts s
      WHERE s.id = ar.shift_id
    )
  )
  WHERE ar.date >= CURRENT_DATE - INTERVAL '7 days'
    AND ar.check_in_at IS NOT NULL
    AND ar.check_out_at IS NOT NULL
    AND ar.shift_id IS NOT NULL;
  $$
);
```

### Monthly Report Generation (via Edge Function)

```sql
SELECT cron.schedule(
  'monthly-report-generation',
  '0 2 1 * *',  -- 2 AM on the 1st of each month
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/generate-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'report_type', 'monthly_summary',
      'period_start', (date_trunc('month', CURRENT_DATE - INTERVAL '1 month'))::date,
      'period_end', (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::date
    )
  );
  $$
);
```

### Late Arrival SMS Alert (via Edge Function + Telnyx)

```sql
-- Trigger-based, not cron — fires when a late check-in is recorded
CREATE OR REPLACE FUNCTION public.send_late_sms()
RETURNS TRIGGER AS $$
DECLARE
  employee_name TEXT;
  supervisor_phone TEXT;
BEGIN
  IF NEW.status = 'late' AND NEW.late_minutes > 30 THEN
    SELECT p.full_name INTO employee_name
    FROM public.profiles p WHERE p.id = NEW.profile_id;

    -- Get supervisor phone for this location
    SELECT p.phone INTO supervisor_phone
    FROM public.profiles p
    JOIN public.location_assignments la ON la.profile_id = p.id
    WHERE la.location_id = NEW.location_id
      AND p.role = 'supervisor'
    LIMIT 1;

    IF supervisor_phone IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-sms',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
          'phone', supervisor_phone,
          'message', employee_name || ' checked in ' || NEW.late_minutes || ' minutes late at ' ||
            (SELECT name FROM public.locations WHERE id = NEW.location_id)
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_late_arrival_sms
  AFTER INSERT ON public.attendance_records
  FOR EACH ROW
  WHEN (NEW.status = 'late')
  EXECUTE FUNCTION public.send_late_sms();
```

**Confidence:** HIGH — [Supabase Cron docs](https://supabase.com/docs/guides/cron) and [pg_cron scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions).

---

## 10. Audit Trail

Use Supabase's `supa_audit` extension for tracking changes to attendance records. This is critical — Saudi labor law requires accurate attendance records.

### Enable supa_audit

```sql
-- Install the supa_audit extension
CREATE EXTENSION IF NOT EXISTS supa_audit CASCADE;

-- Enable auditing on attendance_records (the most critical table)
SELECT audit.enable_tracking('public.attendance_records'::regclass);

-- Enable on leave_requests (approval/rejection history)
SELECT audit.enable_tracking('public.leave_requests'::regclass);

-- Enable on profiles (role changes, deactivations)
SELECT audit.enable_tracking('public.profiles'::regclass);
```

### How It Works

- Every INSERT, UPDATE, DELETE on tracked tables is recorded in `audit.record_version`.
- Each record gets a stable `record_id` (UUID derived from primary key).
- Records include `old_record` and `record` (the new values) as JSONB.
- Uses BRIN indexes for efficient time-range queries.

### Querying Audit History

```sql
-- View all changes to a specific attendance record
SELECT
  id,
  record_id,
  old_record,
  record,
  op,                    -- INSERT, UPDATE, DELETE
  ts,                    -- timestamp
  auth.uid() as changed_by   -- who made the change (if via authenticated request)
FROM audit.record_version
WHERE table_name = 'attendance_records'
  AND record_id = 'some-record-uuid'
ORDER BY ts DESC;
```

### Custom Audit Metadata (who changed it and why)

For cases where we need to track the reason for a modification (e.g., supervisor corrects check-in time):

```sql
CREATE TABLE public.attendance_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL REFERENCES public.attendance_records(id),
  modified_by UUID NOT NULL REFERENCES public.profiles(id),
  modification_reason TEXT NOT NULL,         -- "Employee forgot to check out"
  field_changed TEXT NOT NULL,               -- "check_out_at"
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_modifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can read all modifications"
  ON public.attendance_modifications FOR SELECT TO authenticated
  USING (
    (SELECT (auth.jwt() ->> 'user_role')) IN ('admin', 'hr_officer')
  );

CREATE POLICY "Supervisors can read site modifications"
  ON public.attendance_modifications FOR SELECT TO authenticated
  USING (
    (SELECT (auth.jwt() ->> 'user_role')) = 'supervisor'
    AND attendance_record_id IN (
      SELECT ar.id FROM public.attendance_records ar
      JOIN public.location_assignments la ON la.location_id = ar.location_id
      WHERE la.profile_id = auth.uid()
    )
  );
```

**Confidence:** HIGH — [supa_audit is an official Supabase extension](https://supabase.com/blog/postgres-audit) with [GitHub source](https://github.com/supabase/supa_audit).

---

## 11. Data Seeding Strategy

### Phase 1: Manual Coordinate Extraction

Before any seeding, manually extract GPS coordinates from the 8 Google Maps URLs in the Excel file. Open each link, note the lat/lng from the URL.

### Phase 2: Migration Script

Create a Supabase migration that seeds both locations and employees.

```sql
-- supabase/migrations/20260401000000_seed_initial_data.sql
-- (or use supabase/seed.sql for local dev)

-- =============================================================
-- SEED LOCATIONS
-- =============================================================

INSERT INTO public.locations (name, city, coordinates, geofence_radius_meters, maps_url) VALUES
  ('Head Office', 'Riyadh', ST_SetSRID(ST_MakePoint(46.XXXX, 24.XXXX), 4326)::geography, 100, 'https://maps.app.goo.gl/XaJJmKeXwdZ3XfFi9'),
  ('Factory 1', 'Riyadh', ST_SetSRID(ST_MakePoint(46.XXXX, 24.XXXX), 4326)::geography, 250, 'https://maps.app.goo.gl/ACDZi32X7duAp9uJ6'),
  ('Factory 2', 'Mecca', ST_SetSRID(ST_MakePoint(39.XXXX, 21.XXXX), 4326)::geography, 250, 'https://maps.app.goo.gl/L22LkNdcPohfCazW9'),
  ('Spark Project', 'Al Ehsaa', ST_SetSRID(ST_MakePoint(49.XXXX, 25.XXXX), 4326)::geography, 400, 'https://maps.app.goo.gl/BiabpqhhCGnnKUWA7'),
  ('Rukn AL Manar Project', 'AL Damam', ST_SetSRID(ST_MakePoint(50.XXXX, 26.XXXX), 4326)::geography, 400, 'https://maps.app.goo.gl/MZHyqfVs5Nc39W6C8'),
  ('Mohrkey Project', 'Al Qaseem', ST_SetSRID(ST_MakePoint(43.XXXX, 26.XXXX), 4326)::geography, 400, 'https://maps.app.goo.gl/5ZTjHixtNvgHgLdi9'),
  ('Masar Mecca Project', 'Mecca', ST_SetSRID(ST_MakePoint(39.XXXX, 21.XXXX), 4326)::geography, 400, 'https://maps.app.goo.gl/5ET9T3WcSMwPBSQd9'),
  ('JYC Project', 'Jeddah', ST_SetSRID(ST_MakePoint(39.XXXX, 21.XXXX), 4326)::geography, 400, 'https://maps.app.goo.gl/8APZMLnMXosVUanU7');

-- =============================================================
-- SEED DEFAULT SHIFTS
-- =============================================================

-- Construction standard: 6 AM - 3 PM (Saudi summer heat schedule)
INSERT INTO public.shifts (name, location_id, start_time, end_time, late_threshold_minutes)
SELECT 'Morning Shift', id, '06:00', '15:00', 15
FROM public.locations WHERE name LIKE '%Project%' OR name LIKE '%Factory%';

-- Office hours: 8 AM - 5 PM
INSERT INTO public.shifts (name, location_id, start_time, end_time, late_threshold_minutes)
SELECT 'Office Hours', id, '08:00', '17:00', 15
FROM public.locations WHERE name = 'Head Office';
```

### Phase 3: Employee Import Script (server-side Next.js)

Employees must be created through `auth.admin.createUser()` to generate auth accounts. This cannot be done via SQL alone.

```typescript
// scripts/seed-employees.ts
// Run with: npx tsx scripts/seed-employees.ts

import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Position-to-role mapping
const ROLE_MAP: Record<string, string> = {
  'Labor': 'employee',
  'Driver': 'employee',
  'Accountant': 'employee',
  'Architect': 'employee',
  'Coordinator': 'employee',
  'Site Engeneer': 'employee',
  'Supervisor': 'supervisor',
  'Head Of Department': 'supervisor',
  'HR Officer': 'hr_officer',
  'HR officer': 'hr_officer',
  'HR Manager': 'hr_officer',
  'Regional Manager': 'admin',
  'Factory 1 Manager': 'admin',
}

async function seedEmployees() {
  // Read Excel
  const workbook = XLSX.readFile('locations and Employees (1).xlsx')
  const sheet = workbook.Sheets['Sheet1']

  // Parse employees from rows 18+
  // ... (parse logic)

  // Get location IDs
  const { data: locations } = await supabase.from('locations').select('id, name')
  const locationMap = new Map(locations?.map(l => [l.name.trim(), l.id]) || [])

  for (const employee of employees) {
    const role = ROLE_MAP[employee.position] || 'employee'

    // Generate email from name (or use phone-based auth)
    const email = generateEmail(employee.name) // e.g., "first.last@kunoz.sa"

    // Create auth user (they'll get an invite email)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,  // skip email confirmation for seeded users
      user_metadata: { full_name: employee.name, role },
    })

    if (error) {
      console.error(`Failed: ${employee.name}:`, error.message)
      continue
    }

    // Profile is auto-created by trigger, but update with full data
    const locationId = locationMap.get(employee.location.trim())

    await supabase.from('profiles').update({
      role,
      position: employee.position,
      primary_location_id: locationId,
    }).eq('id', authData.user.id)

    // Create location assignment
    if (locationId) {
      await supabase.from('location_assignments').insert({
        profile_id: authData.user.id,
        location_id: locationId,
        is_primary: true,
      })
    }

    console.log(`Created: ${employee.name} (${role}) at ${employee.location}`)
  }
}

seedEmployees().catch(console.error)
```

### Data Normalization Needed

| Raw Data Issue | Fix |
|----------------|-----|
| "HR officer" vs "HR Officer" | Normalize casing before role mapping |
| "Mohrkey  Project" (double space) | Trim and normalize whitespace |
| "Rukn AL manar" vs "Rukn AL manar Project" | Standardize location names between sections |
| "Masar mecca Project" vs "Masar Mecca Project" | Case-insensitive matching |
| No email/phone data | Generate emails (`first.last@kunoz.sa`) or use phone-based auth |
| No employee IDs | Generate UUIDs via Supabase |

**Confidence:** HIGH for seeding strategy — verified with [Supabase seed docs](https://supabase.com/docs/guides/local-development/seeding-your-database) and [import data docs](https://supabase.com/docs/guides/database/import-data).

---

## 12. Pitfalls & Warnings

### Critical

#### Pitfall 1: JWT Role Staleness
**What goes wrong:** Admin changes a user's role, but the JWT still contains the old role for up to 1 hour.
**Why it happens:** JWTs are stateless tokens — once issued, they cannot be modified.
**Consequences:** User has wrong permissions until token refreshes.
**Prevention:**
- Use Realtime subscription on `profiles` table to detect role changes and force `auth.refreshSession()`.
- Keep token expiry short (e.g., 15 minutes) in Supabase Auth settings.
- For critical operations (role changes, deactivation), use service_role API calls that bypass JWT entirely.

#### Pitfall 2: PostGIS Schema Prefix
**What goes wrong:** PostGIS functions fail with "function not found" errors.
**Why it happens:** PostGIS is installed in the `extensions` schema, not `public`.
**Consequences:** All geofence validation breaks.
**Prevention:** Always prefix PostGIS calls with `extensions.` — e.g., `extensions.ST_Distance()`, not `ST_Distance()`. Or set `search_path` in function definitions.

#### Pitfall 3: RLS on Views Bypasses Security
**What goes wrong:** Creating a view for reports that joins attendance data — the view bypasses RLS.
**Why it happens:** Postgres views default to `security definer` (run as the view creator, who is usually `postgres`).
**Consequences:** Any authenticated user can see all data through the view.
**Prevention:** Use `CREATE VIEW ... WITH (security_invoker = true)` (Postgres 15+) or avoid views entirely — use RPC functions with SECURITY DEFINER that explicitly check permissions.

#### Pitfall 4: Service Role Key Exposed Client-Side
**What goes wrong:** The `SUPABASE_SERVICE_ROLE_KEY` ends up in client-side code.
**Why it happens:** Copy-paste error, or using it in a Next.js Client Component.
**Consequences:** Complete security bypass — anyone can read/write/delete all data.
**Prevention:**
- Only import `SUPABASE_SERVICE_ROLE_KEY` in Server Components, API routes, or Server Actions.
- Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side.
- Audit: `grep -r "SERVICE_ROLE" --include="*.tsx" --include="*.ts" src/` should only match server files.

### Moderate

#### Pitfall 5: GPS Spoofing on Mobile
**What goes wrong:** Employees use GPS spoofing apps to fake their location.
**Prevention:**
- Check device mock location flag (Android exposes this).
- Cross-reference with WiFi/cell tower data.
- Flag suspicious patterns (e.g., employee checks in at 2 sites 500km apart within minutes).
- For construction workers, this is a known problem — consider QR code check-in as secondary verification.

#### Pitfall 6: Saudi Work Week (Sunday-Thursday)
**What goes wrong:** Cron jobs and absence marking use Monday-Friday schedule.
**Consequences:** Friday/Saturday workers get marked absent, Sunday workers get no tracking.
**Prevention:** All cron expressions must use `0-4` for Sunday-Thursday. Make work days configurable per location — some sites may operate on weekends.

#### Pitfall 7: Timezone Handling
**What goes wrong:** Timestamps stored without timezone awareness, causing check-in times to appear wrong.
**Consequences:** A 7:00 AM check-in appears as 4:00 AM (UTC vs AST).
**Prevention:**
- Always use `TIMESTAMPTZ` (not `TIMESTAMP`).
- Store everything in UTC.
- Convert to `Asia/Riyadh` (UTC+3) only in the UI layer.
- Saudi Arabia does not observe DST, which simplifies things.

#### Pitfall 8: Realtime Publication Overhead
**What goes wrong:** Enabling realtime on all tables causes WAL bloat and performance degradation.
**Consequences:** Database slowdown, increased storage costs.
**Prevention:** Only enable realtime on tables that genuinely need it (`attendance_records`, `notifications`, `leave_requests`). Never enable on `audit.record_version` or high-write tables.

### Minor

#### Pitfall 9: Duplicate Check-in Records
**What goes wrong:** Employee taps check-in button twice quickly, creating duplicate records.
**Prevention:** The `UNIQUE(profile_id, date)` constraint on `attendance_records` prevents this at the database level. Use `UPSERT` (ON CONFLICT) in the Edge Function.

#### Pitfall 10: Large Report JSONB
**What goes wrong:** Monthly reports with JSONB containing all attendance records grow very large.
**Prevention:** Store summary data in dedicated columns, keep detailed data in JSONB only for the most recent period. Archive old reports to Supabase Storage as JSON/CSV files.

---

## Sources

### Official Supabase Documentation (HIGH confidence)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [PostGIS Extension](https://supabase.com/docs/guides/database/extensions/postgis)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)
- [Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Cron / pg_cron](https://supabase.com/docs/guides/cron)
- [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
- [supa_audit — Postgres Auditing](https://supabase.com/blog/postgres-audit)
- [Database Seeding](https://supabase.com/docs/guides/local-development/seeding-your-database)
- [Import Data](https://supabase.com/docs/guides/database/import-data)
- [Invite User by Email](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)

### Verified Community Sources (MEDIUM confidence)
- [MakerKit — Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [MakerKit — Real-time Notifications](https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs)
- [Dev.to — Supabase Realtime in Next.js 15](https://dev.to/lra8dev/building-real-time-magic-supabase-subscriptions-in-nextjs-15-2kmp)
- [DesignRevision — Supabase RLS Guide](https://designrevision.com/blog/supabase-row-level-security)
- [supa_audit GitHub](https://github.com/supabase/supa_audit)

### Telnyx Integration (MEDIUM confidence — no official Supabase+Telnyx guide)
- [Telnyx SMS API](https://telnyx.com/resources/integrating-sms-into-unified-communications-platforms)
- [Pipedream Supabase+Telnyx Integration](https://pipedream.com/apps/supabase/integrations/telnyx/send-message-with-telnyx-api-on-new-webhook-event-instant-from-supabase-api-int_ozsNVZ6D)
