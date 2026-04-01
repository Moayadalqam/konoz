import { createClient } from "@/lib/supabase/server";
import type { Shift } from "@/lib/validations/shift";

/**
 * Resolve the currently-effective shift for an employee
 * via the `get_employee_shift` RPC, then fetch the full shift row.
 */
export async function resolveEmployeeShift(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string
): Promise<Shift | null> {
  const { data: result } = await supabase.rpc("get_employee_shift", {
    p_employee_id: employeeId,
  });

  if (!result) return null;

  const { data: shift } = await supabase
    .from("shifts")
    .select("*")
    .eq("id", result)
    .single();

  return shift as Shift | null;
}
