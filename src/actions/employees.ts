"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import {
  employeeSchema,
  type EmployeeFormData,
  type EmployeeFilters,
} from "@/lib/validations/employee";
import { VALID_ROLES, type AppRole } from "@/lib/auth/types";
import { handleActionError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function createEmployeeAction(data: EmployeeFormData) {
  await requireRole("admin", "hr_officer");

  const parsed = employeeSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();

  const { error } = await supabase.from("employees").insert({
    employee_number: parsed.data.employee_number,
    full_name: parsed.data.full_name,
    phone: parsed.data.phone || null,
    department: parsed.data.department || null,
    position: parsed.data.position || null,
    primary_location_id: parsed.data.primary_location_id || null,
    profile_id: parsed.data.profile_id || null,
    is_active: parsed.data.is_active,
  });

  if (error) handleActionError(error, "createEmployeeAction", { employeeNumber: parsed.data.employee_number });

  logger.info("createEmployeeAction", "Employee created", { employeeNumber: parsed.data.employee_number });
  revalidatePath("/dashboard/employees");
}

export async function updateEmployeeAction(
  id: string,
  data: EmployeeFormData & { role?: AppRole }
) {
  await requireRole("admin", "hr_officer");

  if (!id) throw new Error("Invalid employee ID");

  const parsed = employeeSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("employees")
    .update({
      employee_number: parsed.data.employee_number,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      department: parsed.data.department || null,
      position: parsed.data.position || null,
      primary_location_id: parsed.data.primary_location_id || null,
      profile_id: parsed.data.profile_id || null,
      is_active: parsed.data.is_active,
    })
    .eq("id", id);

  if (error) handleActionError(error, "updateEmployeeAction", { employeeId: id });

  // If employee has linked profile and role change requested, update profiles.role
  if (data.role && VALID_ROLES.includes(data.role) && parsed.data.profile_id) {
    const adminClient = createAdminClient();
    const { error: roleError } = await adminClient
      .from("profiles")
      .update({ role: data.role })
      .eq("id", parsed.data.profile_id);

    if (roleError) handleActionError(roleError, "updateEmployeeAction", { profileId: parsed.data.profile_id, role: data.role });
  }

  logger.info("updateEmployeeAction", "Employee updated", { employeeId: id });
  revalidatePath("/dashboard/employees");
}

export async function toggleEmployeeActiveAction(id: string) {
  await requireRole("admin", "hr_officer");

  if (!id) throw new Error("Invalid employee ID");

  const supabase = await createClient();

  // Get current status
  const { data: employee, error: fetchError } = await supabase
    .from("employees")
    .select("is_active")
    .eq("id", id)
    .single();

  if (fetchError) handleActionError(fetchError, "toggleEmployeeActiveAction", { employeeId: id });

  const { error } = await supabase
    .from("employees")
    .update({ is_active: !employee.is_active })
    .eq("id", id);

  if (error) handleActionError(error, "toggleEmployeeActiveAction", { employeeId: id });

  logger.info("toggleEmployeeActiveAction", `Employee ${employee.is_active ? "deactivated" : "activated"}`, { employeeId: id });
  revalidatePath("/dashboard/employees");
}

export async function assignEmployeeLocationAction(
  id: string,
  locationId: string | null
) {
  await requireRole("admin", "hr_officer");

  if (!id) throw new Error("Invalid employee ID");

  const supabase = await createClient();

  const { error } = await supabase
    .from("employees")
    .update({ primary_location_id: locationId })
    .eq("id", id);

  if (error) handleActionError(error, "assignEmployeeLocationAction", { employeeId: id, locationId });

  logger.info("assignEmployeeLocationAction", "Employee location assigned", { employeeId: id, locationId });
  revalidatePath("/dashboard/employees");
}

export async function linkEmployeeProfileAction(
  employeeId: string,
  profileId: string | null
) {
  await requireRole("admin");

  if (!employeeId) throw new Error("Invalid employee ID");

  const supabase = await createClient();

  const { error } = await supabase
    .from("employees")
    .update({ profile_id: profileId })
    .eq("id", employeeId);

  if (error) handleActionError(error, "linkEmployeeProfileAction", { employeeId, profileId });

  logger.info("linkEmployeeProfileAction", "Employee profile linked", { employeeId, profileId });
  revalidatePath("/dashboard/employees");
}

export async function getEmployeesAction(filters?: EmployeeFilters) {
  await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("employees")
    .select("*, locations(name)")
    .order("employee_number");

  if (filters?.locationId) {
    query = query.eq("primary_location_id", filters.locationId);
  }
  if (filters?.department) {
    query = query.eq("department", filters.department);
  }
  if (filters?.isActive !== undefined) {
    query = query.eq("is_active", filters.isActive);
  }
  if (filters?.search) {
    // Sanitize search input to prevent PostgREST filter injection
    const sanitized = filters.search.replace(/[%_.,()]/g, "");
    if (sanitized.length > 0) {
      query = query.or(
        `full_name.ilike.%${sanitized}%,employee_number.ilike.%${sanitized}%`
      );
    }
  }

  const { data, error } = await query;

  if (error) handleActionError(error, "getEmployeesAction");
  return data;
}

export async function getEmployeeAction(id: string) {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employees")
    .select("*, locations(id, name, city, latitude, longitude)")
    .eq("id", id)
    .single();

  if (error) handleActionError(error, "getEmployeeAction", { employeeId: id });

  // If linked to a profile, fetch profile info
  let profile = null;
  if (data.profile_id) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, registration_status")
      .eq("id", data.profile_id)
      .single();
    profile = profileData;
  }

  return { ...data, profile };
}
