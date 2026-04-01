"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import type { AppRole, RegistrationStatus } from "@/lib/auth/types";

const VALID_ROLES: AppRole[] = ["admin", "hr_officer", "supervisor", "employee"];

export async function approveUserAction(userId: string) {
  await requireRole("admin", "hr_officer");

  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid user ID");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ registration_status: "approved" satisfies RegistrationStatus })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

export async function rejectUserAction(userId: string) {
  await requireRole("admin", "hr_officer");

  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid user ID");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ registration_status: "rejected" satisfies RegistrationStatus })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

export async function changeRoleAction(userId: string, role: AppRole) {
  await requireRole("admin");

  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid user ID");
  }

  if (!VALID_ROLES.includes(role)) {
    throw new Error("Invalid role");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}
