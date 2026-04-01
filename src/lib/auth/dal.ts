import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "./types";

/** Get the current authenticated user or null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Get the current user's profile or null. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
}

/** Require an authenticated, approved user. Redirects if not. */
export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.registration_status === "pending") {
    redirect("/pending-approval");
  }

  if (profile.registration_status === "rejected") {
    redirect("/login?error=rejected");
  }

  return profile;
}

/** Require a specific role. Redirects to dashboard if unauthorized. */
export async function requireRole(
  ...roles: AppRole[]
): Promise<Profile> {
  const profile = await requireAuth();

  if (!roles.includes(profile.role)) {
    redirect("/dashboard");
  }

  return profile;
}
