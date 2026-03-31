# Phase 1: Project Setup & Auth — Execution Plan

## Objective

Scaffold the Next.js 16+ project, configure Supabase (auth + database), implement self-registration with email verification, role-based access control via RLS, and build the responsive app shell with protected routing. By the end, a user can register, get approved by admin, log in, and see role-appropriate content.

## Prerequisites

- Supabase project created (via MCP or dashboard)
- Vercel project linked (for deployment later)
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Implementation Steps

### Step 1: Initialize Next.js Project

Create the Next.js 16+ project with TypeScript, Tailwind CSS v4, and essential dependencies.

**Actions:**
- `npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"` (in project root)
- Install dependencies:
  - `@supabase/supabase-js` + `@supabase/ssr` — Supabase client + SSR auth
  - `zod` — validation
  - `lucide-react` — icons
  - `class-variance-authority` + `clsx` + `tailwind-merge` — utility for shadcn
- Initialize shadcn/ui: `npx shadcn@latest init`
- Add shadcn components: `button`, `input`, `label`, `card`, `badge`, `dropdown-menu`, `avatar`, `separator`, `toast`, `dialog`, `table`, `select`, `form`
- Configure fonts in `layout.tsx`: Plus Jakarta Sans (headings), Inter (body), JetBrains Mono (data)
- Set up Tailwind theme with Kunoz color palette from DESIGN.md:
  - Primary: `#0D7377` (deep teal)
  - Accent: `#F59E0B` (amber)
  - Success: `#059669`, Danger: `#DC2626`

**Files created/modified:**
- `package.json` — dependencies
- `src/app/layout.tsx` — root layout with fonts + providers
- `tailwind.config.ts` — Kunoz color palette, font families
- `src/app/globals.css` — base styles, CSS variables
- `src/lib/utils.ts` — cn() helper (shadcn)
- `components.json` — shadcn config

**Acceptance criteria:**
- `npm run dev` starts without errors
- Fonts render correctly (Plus Jakarta Sans headings, Inter body)
- Tailwind colors match DESIGN.md palette

---

### Step 2: Supabase Client Setup

Create the Supabase client utilities for both browser and server contexts using `@supabase/ssr`.

**Actions:**
- Create browser client (`createBrowserClient` from `@supabase/ssr`)
- Create server client (`createServerClient` from `@supabase/ssr` with `cookies()` from `next/headers`)
- Create admin client (service role — server-only, for role assignment)
- Add `.env.local` template (never commit actual values)

**Files created:**
- `src/lib/supabase/client.ts` — browser client (singleton)
- `src/lib/supabase/server.ts` — server client (per-request)
- `src/lib/supabase/admin.ts` — service role client (server actions only)
- `.env.local.example` — template with required vars
- `.gitignore` — ensure `.env*` excluded

**Acceptance criteria:**
- Browser client accessible in client components
- Server client accessible in server components and server actions
- Admin client only importable server-side
- No `service_role` key exposed to client

---

### Step 3: Database Schema & RLS

Create the core database tables and Row Level Security policies via Supabase migration.

**Schema:**

```sql
-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'hr_officer', 'supervisor', 'employee');

-- Enum for registration status
CREATE TYPE public.registration_status AS ENUM ('pending', 'approved', 'rejected');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  registration_status registration_status NOT NULL DEFAULT 'pending',
  phone TEXT,
  position TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: auto-create profile on auth signup
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: update updated_at on profile change
CREATE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

**RLS Policies on `profiles`:**

IMPORTANT: To avoid infinite recursion (policies on `profiles` querying `profiles`), use a `SECURITY DEFINER` helper function:

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role without triggering RLS (avoids infinite recursion)
CREATE FUNCTION public.get_user_role(user_id UUID)
RETURNS app_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is approved
CREATE FUNCTION public.is_user_approved(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT registration_status = 'approved' FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- SELECT: Everyone can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- SELECT: Admin and HR can view all profiles
CREATE POLICY "Admin/HR can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'hr_officer')
    AND public.is_user_approved(auth.uid())
  );

-- SELECT: Supervisors can view approved profiles (location-scoped in Phase 2)
CREATE POLICY "Supervisors can view approved profiles"
  ON public.profiles FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = 'supervisor'
    AND public.is_user_approved(auth.uid())
    AND registration_status = 'approved'
  );

-- INSERT: Only the trigger (SECURITY DEFINER) can insert profiles
-- No direct INSERT policy needed — handle_new_user() runs as SECURITY DEFINER
-- Explicitly deny direct inserts from users:
CREATE POLICY "No direct inserts"
  ON public.profiles FOR INSERT
  WITH CHECK (false);

-- UPDATE: Users can update ONLY safe fields on their own profile
-- Prevents privilege escalation (cannot change own role or registration_status)
CREATE POLICY "Users can update own safe fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND registration_status = (SELECT registration_status FROM public.profiles WHERE id = auth.uid())
  );

-- UPDATE: Admin/HR can update any profile (including role and status)
CREATE POLICY "Admin/HR can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'hr_officer')
    AND public.is_user_approved(auth.uid())
  );

-- DELETE: Only admin can delete profiles
CREATE POLICY "Admin can delete profiles"
  ON public.profiles FOR DELETE
  USING (
    public.get_user_role(auth.uid()) = 'admin'
    AND public.is_user_approved(auth.uid())
  );
```

**Files created:**
- Migration applied via Supabase MCP `apply_migration`

**Acceptance criteria:**
- Profiles table created with correct schema
- RLS enabled — user can only read own profile unless admin/HR
- Trigger auto-creates profile row on signup
- `updated_at` auto-updates on modification

---

### Step 4: Auth Middleware & Session Management

Implement Next.js middleware that refreshes Supabase sessions on every request and protects routes by auth state and role.

**Actions:**
- Create middleware at `src/middleware.ts` using `@supabase/ssr` `createServerClient`
- Use `supabase.auth.getClaims()` to refresh session (not `getUser()` — per latest Supabase docs)
- Route protection logic:
  - `/login`, `/signup`, `/auth/**` — public (redirect to dashboard if already logged in)
  - `/pending-approval` — accessible to authenticated users with `registration_status = 'pending'`
  - `/dashboard/**` — requires authenticated + approved user
  - `/admin/**` — requires `admin` role
- Create a Data Access Layer (DAL) module for session/role verification in server components

**Files created:**
- `src/middleware.ts` — route protection + session refresh
- `src/lib/auth/dal.ts` — `getSession()`, `getUser()`, `requireRole()` helpers
- `src/lib/auth/types.ts` — role types, session types

**Acceptance criteria:**
- Unauthenticated users redirected to `/login`
- Authenticated but pending users redirected to `/pending-approval`
- Role-based access enforced (non-admin can't access `/admin/**`)
- Session persists across page refreshes (cookie-based)

---

### Step 5: Auth Pages (Signup, Login, Password Reset)

Build the auth UI pages with Kunoz branding.

**Actions:**
- **Signup page** (`/signup`):
  - Form: full name, email, password, confirm password
  - Validation with Zod (email format, password 8+ chars, passwords match)
  - Server action calls `supabase.auth.signUp()` with `full_name` in metadata
  - On success → redirect to `/verify-email` confirmation page
- **Login page** (`/login`):
  - Form: email, password
  - Server action calls `supabase.auth.signInWithPassword()`
  - On success → check profile `registration_status`:
    - `pending` → redirect to `/pending-approval`
    - `approved` → redirect to role-based dashboard
    - `rejected` → show error message
  - "Forgot password?" link
- **Password reset** (`/reset-password`):
  - Form: email
  - Server action calls `supabase.auth.resetPasswordForEmail()`
  - Confirmation message shown
- **Update password** (`/auth/update-password`):
  - Form: new password, confirm
  - Server action calls `supabase.auth.updateUser()`
- **Verify email page** (`/verify-email`):
  - Static message: "Check your email to confirm your account"
- **Auth callback** (`/auth/callback/route.ts`):
  - Handles email confirmation and password reset redirects
  - Exchanges code for session via `supabase.auth.exchangeCodeForSession()`
- **Pending approval** (`/pending-approval`):
  - Message: "Your account is pending approval. You'll be notified when approved."

**UI requirements:**
- Centered card layout on auth pages
- Kunoz logo/wordmark at top
- Deep teal primary button
- Input focus ring in teal
- Error messages in red with icon
- Loading state on submit buttons
- Mobile-responsive (full-width on small screens)

**Files created:**
- `src/app/(auth)/layout.tsx` — auth layout (centered, branded)
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/signup/page.tsx`
- `src/app/(auth)/verify-email/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/app/(auth)/pending-approval/page.tsx`
- `src/app/auth/callback/route.ts` — auth callback handler
- `src/app/auth/update-password/page.tsx`
- `src/lib/validations/auth.ts` — Zod schemas for auth forms
- `src/actions/auth.ts` — server actions for signup, login, reset

**Acceptance criteria:**
- User can sign up with valid email → receives verification email
- User can log in after email verified
- Login redirects to pending page if not approved
- Password reset flow works end-to-end
- Form validation shows inline errors
- Auth pages look branded and professional on mobile + desktop

---

### Step 6: Admin Role Management

Build the admin page for approving registrations and assigning roles.

**Actions:**
- **Admin users page** (`/admin/users`):
  - Table of all registered users with columns: name, email, role, status, registered date
  - Filter by status: pending, approved, rejected
  - Filter by role
  - Sortable columns
- **User actions:**
  - Approve registration (sets `registration_status = 'approved'`)
  - Reject registration (sets `registration_status = 'rejected'`)
  - Change role (dropdown: admin, hr_officer, supervisor, employee)
- Uses admin (service role) client for role changes to bypass RLS
- All actions are server actions with role verification

**Files created:**
- `src/app/(dashboard)/admin/users/page.tsx` — user management page
- `src/components/admin/users-table.tsx` — data table component
- `src/components/admin/user-actions.tsx` — approve/reject/role-change actions
- `src/actions/admin.ts` — server actions for user management

**Acceptance criteria:**
- Admin sees all users in a table
- Can filter by pending status to see new registrations
- Can approve → user can now log in to dashboard
- Can change roles → role reflected in profile and RLS
- Non-admin cannot access this page (middleware redirects)

---

### Step 7: App Shell & Dashboard Layout

Build the main application layout with role-aware navigation.

**Actions:**
- **Sidebar navigation** (desktop: left sidebar, mobile: bottom nav / hamburger):
  - Common: Dashboard, My Profile
  - Employee: My Attendance (placeholder)
  - Supervisor: Site Attendance, Bulk Check-in (placeholders)
  - HR: Reports, Employees, Locations (placeholders)
  - Admin: Users, Settings (admin panel)
- **Top bar**: User avatar dropdown (profile, logout), online/offline indicator placeholder
- **Dashboard home** (`/dashboard`): Role-based landing
  - Admin: "Welcome, [name]. [X] pending approvals" card
  - HR: Quick stats placeholder
  - Supervisor: Site summary placeholder
  - Employee: Check-in button placeholder
- **Profile page** (`/dashboard/profile`): View/edit own profile
- Responsive: sidebar collapses to bottom nav on mobile per DESIGN.md breakpoints

**Files created:**
- `src/app/(dashboard)/layout.tsx` — dashboard layout with sidebar
- `src/components/layout/sidebar.tsx` — role-aware sidebar navigation
- `src/components/layout/topbar.tsx` — top bar with user menu
- `src/components/layout/mobile-nav.tsx` — bottom navigation for mobile
- `src/app/(dashboard)/dashboard/page.tsx` — role-based dashboard home
- `src/app/(dashboard)/dashboard/profile/page.tsx` — user profile page
- `src/actions/profile.ts` — update profile server action

**Acceptance criteria:**
- Sidebar shows navigation items based on user role
- Mobile layout uses bottom nav or hamburger menu
- Dashboard home shows role-appropriate content
- User can view and edit their profile
- Logout works and redirects to login
- Layout matches DESIGN.md (teal palette, Plus Jakarta Sans headings, fluid widths)

---

### Step 8: Seed First Admin User

Create a seed mechanism so the client demo has at least one admin user ready.

**Actions:**
- Seed script using Supabase admin API (`supabase.auth.admin.createUser()`) that:
  1. Creates an admin user with a known email/password
  2. Sets their profile to `role = 'admin'` and `registration_status = 'approved'`
- Admin credentials stored in `.env.local` (never committed)
- Script is idempotent — skips if admin already exists

**Files created:**
- `src/scripts/seed-admin.ts` — seed utility (run once via `npx tsx src/scripts/seed-admin.ts`)

**Acceptance criteria:**
- At least one admin user can log in and approve other users
- Demo can start with a working admin account

## Verification Checklist

- [ ] `npm run dev` starts clean, no TypeScript errors
- [ ] User can register → verify email → see pending approval page
- [ ] Admin can log in → approve user → user can now access dashboard
- [ ] Admin can change user roles (admin, hr_officer, supervisor, employee)
- [ ] Non-approved users cannot access dashboard routes
- [ ] Role-based navigation shows correct menu items per role
- [ ] Password reset flow works end-to-end
- [ ] RLS policies prevent unauthorized data access (test with different roles)
- [ ] Mobile layout responsive with bottom nav
- [ ] Auth pages branded with Kunoz design system (teal, Plus Jakarta Sans)
- [ ] No `service_role` key exposed in client bundle
- [ ] `npx tsc --noEmit` passes

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Email delivery in dev (Supabase rate limits) | Use Supabase dashboard to confirm users manually during dev, or disable email confirmation temporarily |
| RLS infinite recursion (profile reads profile in policy) | Use `auth.uid()` directly in policies, avoid subqueries that re-read the policy table — use a helper function with `SECURITY DEFINER` if needed |
| Middleware performance (DB call on every request) | Use `getClaims()` for JWT-based checks, only hit DB for role verification on protected admin routes |
| First admin chicken-and-egg | Seed script or auto-promote first user to admin |
| Tailwind v4 breaking changes | Pin version, verify shadcn compatibility |

## Execution Waves

For parallel agent execution:

| Wave | Tasks | Agents | Notes |
|------|-------|--------|-------|
| 1 | Step 1 (project init) + Step 2 (Supabase clients) | backend | Independent — can parallelize |
| 2 | Step 3 (schema + RLS) | backend | Depends on Supabase project existing |
| 3 | Step 4 (middleware + DAL) | backend | Must complete before Wave 4 — auth pages depend on DAL |
| 4 | Step 5 (auth pages) + Step 6 (admin panel) | frontend + backend | Pages import from DAL (Step 4). Can parallelize signup/login vs admin. |
| 5 | Step 7 (app shell + layout) + Step 8 (seed) | frontend + backend | Shell wraps all pages. Seed creates demo admin. |

---
*Plan created: 2026-03-31*
*Requirements covered: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06*
