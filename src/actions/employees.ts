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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);

  // If employee has linked profile and role change requested, update profiles.role
  if (data.role && VALID_ROLES.includes(data.role) && parsed.data.profile_id) {
    const adminClient = createAdminClient();
    const { error: roleError } = await adminClient
      .from("profiles")
      .update({ role: data.role })
      .eq("id", parsed.data.profile_id);

    if (roleError) throw new Error(roleError.message);
  }

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

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("employees")
    .update({ is_active: !employee.is_active })
    .eq("id", id);

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);

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
