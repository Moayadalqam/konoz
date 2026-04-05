import { createClient } from "@/lib/supabase/server";
import type { Shift } from "@/lib/validations/shift";

/**
 * Resolve the currently-effective shift for an employee in a single query.
 *
 * Priority: employee-specific assignment > location-based assignment.
 * Uses shift_assignments joined with shifts, filtered by effective dates,
 * replicating the logic of the `get_employee_shift` RPC without the extra
 * round-trip to fetch the full shift row.
 *
 * @param locationId – the employee's primary_location_id (pass it to avoid
 *   an extra lookup; callers already have it from the employee query).
 */
export async function resolveEmployeeShift(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string,
  locationId?: string | null
): Promise<Shift | null> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });

  // Build OR filter: employee-specific OR location-based assignments
  const orClauses = [`employee_id.eq.${employeeId}`];
  if (locationId) {
    orClauses.push(`location_id.eq.${locationId}`);
  }

  const { data: assignments } = await supabase
    .from("shift_assignments")
    .select("employee_id, shifts(*)")
    .or(orClauses.join(","))
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order("effective_from", { ascending: false })
    .limit(10); // fetch candidates, then pick best in JS

  if (!assignments || assignments.length === 0) return null;

  // Priority: employee-specific (employee_id is not null) > location-based
  const sorted = assignments.sort((a, b) => {
    const aPriority = a.employee_id ? 0 : 1;
    const bPriority = b.employee_id ? 0 : 1;
    return aPriority - bPriority;
  });

  const best = sorted[0];
  const shift = best.shifts as unknown as Shift | null;

  return shift ?? null;
}
