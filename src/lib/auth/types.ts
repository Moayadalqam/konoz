export type AppRole = "admin" | "hr_officer" | "supervisor" | "employee";
export const VALID_ROLES: AppRole[] = ["admin", "hr_officer", "supervisor", "employee"];
export type RegistrationStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  registration_status: RegistrationStatus;
  phone: string | null;
  position: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
