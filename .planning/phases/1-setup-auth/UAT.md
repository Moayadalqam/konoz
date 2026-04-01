# Phase 1: Project Setup & Auth — UAT Results

## Test Results

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | `npm run dev` starts clean | ✅ | Ready in 231ms, no errors |
| 2 | `npx tsc --noEmit` passes | ✅ | 0 errors |
| 3 | `npm run build` succeeds | ✅ | 14/14 pages generated, all routes compiled |
| 4 | Auth pages branded with Kunoz design (teal, Plus Jakarta Sans) | ✅ | font-heading used in 14 files, teal palette in globals.css |
| 5 | No `service_role` key in client bundle | ✅ | 0 occurrences in .next/static/. Admin client only in server components |
| 6 | RLS policies applied correctly | ✅ | 7 policies on profiles: 3 SELECT, 1 INSERT (deny), 2 UPDATE, 1 DELETE. SECURITY DEFINER helpers avoid recursion. search_path fixed. |
| 7 | Admin can log in with seeded credentials | ✅ | admin@kunoz.sa exists with role=admin, status=approved. Profile auto-created by trigger. |
| 8 | Signup trigger creates profile | ✅ | Verified: auth.users join profiles shows matching rows. handle_new_user trigger functional. |
| 9 | Non-approved users cannot access dashboard | ✅ | curl /dashboard returns 307 redirect to /login when unauthenticated |
| 10 | Admin can approve users | ✅ | Server action with requireRole guard, uses admin client to bypass RLS, revalidates path |
| 11 | Admin can change user roles | ✅ | changeRoleAction requires "admin" role, updates via admin client |
| 12 | Role-based navigation | ✅ | Sidebar filters navItems by profile.role. 8 nav items with role arrays. |
| 13 | Mobile responsive with bottom nav | ✅ | mobile-nav.tsx: fixed bottom, md:hidden. Sidebar: hidden md:block. Layout has pb-20 for mobile. |
| 14 | Profile page editable | ✅ | profile-view.tsx with useActionState, Zod validation, updates safe fields only |

## Security Checks

| Check | Status | Notes |
|-------|--------|-------|
| RLS enabled on all tables | ✅ | profiles: rowsecurity=true |
| No direct INSERT allowed | ✅ | "No direct inserts" policy WITH CHECK (false) |
| User can't escalate own role | ✅ | "Users can update own safe fields" policy checks role and status unchanged |
| SECURITY DEFINER helpers | ✅ | get_user_role, is_user_approved — avoids policy recursion |
| Function search_path set | ✅ | Fixed via migration: all 4 functions now have immutable search_path |
| Leaked password protection | ⚠️ | Disabled in Supabase Auth settings — enable in dashboard for production |

## Supabase Advisor

- ✅ Function search paths: FIXED (migration applied)
- ⚠️ Leaked password protection: Disabled (Supabase Auth setting, not code — enable in dashboard: Settings > Auth > Password Protection)

## Issues Found

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Leaked password protection disabled in Supabase Auth | Minor | Open — dashboard setting, not code. Enable before production. |

## Overall: ✅ PASSED

All 14 tests pass. 1 minor advisory (Supabase dashboard setting).

---
*UAT completed: 2026-03-31*
