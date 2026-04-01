"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type ProfileActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

const updateProfileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  position: z.string().optional(),
});

export async function updateProfileAction(
  prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const profile = await requireAuth();
  const raw = {
    full_name: formData.get("full_name") as string,
    phone: (formData.get("phone") as string) || undefined,
    position: (formData.get("position") as string) || undefined,
  };

  const result = updateProfileSchema.safeParse(raw);
  if (!result.success) {
    return {
      error: "Invalid input",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(result.data)
    .eq("id", profile.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/profile");
  return { success: true };
}
