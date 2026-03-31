---
phase: 6-reports-hr-actions
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/scripts/migrate-phase6.ts
autonomous: true
user_setup: []

must_haves:
  truths:
    - "hr_action_logs table exists with correct columns and RLS policies"
    - "employee_warnings table exists with correct columns and RLS policies"
    - "attendance_records has overtime_status, overtime_approved_by, and leave_reason columns"
    - "Only admin and hr_officer can read/write hr_action_logs and employee_warnings"
  artifacts:
    - path: "src/scripts/migrate-phase6.ts"
      provides: "Database migration script for Phase 6 tables and columns"
      min_lines: 80
  key_links:
    - from: "src/scripts/migrate-phase6.ts"
      to: "src/lib/supabase/admin.ts"
      via: "uses service_role client for DDL"
      pattern: "createAdminClient|SUPABASE_SERVICE_ROLE_KEY"
---

<objective>
Create and run the database migration for Phase 6: two new tables (hr_action_logs, employee_warnings) and three new columns on attendance_records (overtime_status, overtime_approved_by, leave_reason).

Purpose: All HR action server actions and report queries depend on these schema changes existing first.
Output: Migration script executed, all tables/columns live in Supabase.
</objective>

<execution_context>
@/home/moayadalqam/.claude/qualia-engine/workflows/execute-plan.md
@/home/moayadalqam/.claude/qualia-engine/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@src/lib/supabase/admin.ts
@src/lib/validations/attendance.ts
@src/lib/validations/hr-actions.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create and run Phase 6 database migration</name>
  <files>src/scripts/migrate-phase6.ts</files>
  <action>
Create `/home/moayadalqam/projects/kunoz/src/scripts/migrate-phase6.ts` and run the migration SQL in the Supabase SQL Editor. The script file documents the schema changes for version control.

The complete SQL to run in the Supabase SQL Editor (Dashboard > SQL Editor):

```sql
-- 1. Add columns to attendance_records
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS overtime_status text DEFAULT 'pending'
    CHECK (overtime_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS overtime_approved_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS leave_reason text
    CHECK (leave_reason IN ('annual_leave', 'sick_leave', 'personal_leave', 'emergency', 'official_business', 'unpaid_leave', 'other'));

-- 2. Create hr_action_logs table
CREATE TABLE IF NOT EXISTS hr_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL CHECK (action_type IN ('attendance_correction', 'overtime_approval', 'overtime_rejection', 'warning_issued', 'leave_marked', 'absence_marked')),
  target_record_id uuid NOT NULL,
  target_table text NOT NULL DEFAULT 'attendance_records',
  performed_by uuid NOT NULL REFERENCES profiles(id),
  old_values jsonb,
  new_values jsonb,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create employee_warnings table
CREATE TABLE IF NOT EXISTS employee_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  issued_by uuid NOT NULL REFERENCES profiles(id),
  warning_type text NOT NULL CHECK (warning_type IN ('excessive_lateness', 'excessive_absence', 'unauthorized_absence', 'early_departure', 'geofence_violation', 'other')),
  description text NOT NULL,
  attendance_record_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_hr_action_logs_target ON hr_action_logs(target_record_id);
CREATE INDEX IF NOT EXISTS idx_hr_action_logs_performed_by ON hr_action_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_hr_action_logs_created_at ON hr_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_warnings_employee ON employee_warnings(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_warnings_created_at ON employee_warnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_overtime_status ON attendance_records(overtime_status) WHERE is_overtime = true;

-- 5. Enable RLS
ALTER TABLE hr_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_warnings ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for hr_action_logs
CREATE POLICY "hr_action_logs_select" ON hr_action_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'hr_officer'))
);
CREATE POLICY "hr_action_logs_insert" ON hr_action_logs FOR INSERT TO authenticated WITH CHECK (
  performed_by = auth.uid() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'hr_officer'))
);

-- 7. RLS policies for employee_warnings
CREATE POLICY "employee_warnings_select" ON employee_warnings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'hr_officer'))
);
CREATE POLICY "employee_warnings_insert" ON employee_warnings FOR INSERT TO authenticated WITH CHECK (
  issued_by = auth.uid() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'hr_officer'))
);

-- 8. Allow HR to update attendance_records (for corrections)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'attendance_hr_update' AND tablename = 'attendance_records') THEN
    CREATE POLICY attendance_hr_update ON attendance_records FOR UPDATE TO authenticated USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'hr_officer'))
    );
  END IF;
END $$;

-- 9. Allow HR to insert attendance_records (for marking leave/absence)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'attendance_hr_insert' AND tablename = 'attendance_records') THEN
    CREATE POLICY attendance_hr_insert ON attendance_records FOR INSERT TO authenticated WITH CHECK (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'hr_officer'))
    );
  END IF;
END $$;
```

The TypeScript migration script file should contain the same SQL as documentation and attempt programmatic execution:

```ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/*
 * Phase 6 Migration: Reports & HR Actions
 *
 * Tables created:
 *   - hr_action_logs (audit trail for all HR actions)
 *   - employee_warnings (warning notices issued to employees)
 *
 * Columns added to attendance_records:
 *   - overtime_status (pending/approved/rejected)
 *   - overtime_approved_by (uuid ref to profiles)
 *   - leave_reason (enum of leave types)
 *
 * RLS policies:
 *   - hr_action_logs: admin/hr_officer can SELECT/INSERT
 *   - employee_warnings: admin/hr_officer can SELECT/INSERT
 *   - attendance_records: admin/hr_officer can UPDATE/INSERT (for corrections/leave)
 *
 * Run the SQL above in Supabase Dashboard > SQL Editor if programmatic execution fails.
 */

async function verifyMigration() {
  console.log("Verifying Phase 6 migration...\n");

  const { error: e1 } = await supabase.from("hr_action_logs").select("id").limit(0);
  console.log("hr_action_logs:", e1 ? `FAIL: ${e1.message}` : "OK");

  const { error: e2 } = await supabase.from("employee_warnings").select("id").limit(0);
  console.log("employee_warnings:", e2 ? `FAIL: ${e2.message}` : "OK");

  const { error: e3 } = await supabase
    .from("attendance_records")
    .select("overtime_status, overtime_approved_by, leave_reason")
    .limit(1);
  console.log("attendance_records new columns:", e3 ? `FAIL: ${e3.message}` : "OK");
}

verifyMigration().catch(console.error);
```

The executor should:
1. First run the SQL in Supabase Dashboard SQL Editor
2. Then run `npx tsx src/scripts/migrate-phase6.ts` to verify the migration succeeded
  </action>
  <verify>
After running the migration, verify with:

```bash
cd /home/moayadalqam/projects/kunoz && npx tsx src/scripts/migrate-phase6.ts
```
Expected output:
```
Verifying Phase 6 migration...
hr_action_logs: OK
employee_warnings: OK
attendance_records new columns: OK
```
  </verify>
  <done>
hr_action_logs table exists with action_type, target_record_id, performed_by, old_values, new_values, reason columns.
employee_warnings table exists with employee_id, issued_by, warning_type, description, attendance_record_ids columns.
attendance_records has overtime_status (default 'pending'), overtime_approved_by, and leave_reason columns.
RLS enabled on both new tables — only admin/hr_officer can read/write.
HR can update and insert attendance_records via RLS policies.
  </done>
</task>

</tasks>

<verification>
- All three new columns exist on attendance_records
- hr_action_logs and employee_warnings tables exist with RLS enabled
- Script file committed to repo for reproducibility
</verification>

<success_criteria>
- `SELECT * FROM hr_action_logs LIMIT 0` succeeds via service_role
- `SELECT * FROM employee_warnings LIMIT 0` succeeds via service_role
- `SELECT overtime_status, leave_reason FROM attendance_records LIMIT 1` succeeds
- All indexes created on high-query columns
</success_criteria>

<output>
After completion, create `.planning/phases/6-reports-hr-actions/6-02-SUMMARY.md`
</output>
