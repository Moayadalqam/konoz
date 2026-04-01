import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { UsersTable } from "@/components/admin/users-table";
import type { Profile, RegistrationStatus, AppRole } from "@/lib/auth/types";

type SearchParams = Promise<{
  status?: string;
  role?: string;
}>;

export const metadata = {
  title: "User Management — Kunoz",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const currentUser = await requireRole("admin");
  const params = await searchParams;

  const supabase = createAdminClient();

  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Apply filters from search params
  const statusFilter = params.status as RegistrationStatus | undefined;
  if (
    statusFilter &&
    ["pending", "approved", "rejected"].includes(statusFilter)
  ) {
    query = query.eq("registration_status", statusFilter);
  }

  const roleFilter = params.role as AppRole | undefined;
  if (
    roleFilter &&
    ["admin", "hr_officer", "supervisor", "employee"].includes(roleFilter)
  ) {
    query = query.eq("role", roleFilter);
  }

  const { data: profiles, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  // Count pending approvals for the banner
  const { count: pendingCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("registration_status", "pending");

  return (
    <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          User Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage user registrations, roles, and access permissions.
        </p>
      </div>

      {pendingCount != null && pendingCount > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
            <span className="text-sm font-semibold">{pendingCount}</span>
          </div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {pendingCount === 1
              ? "1 user is awaiting approval"
              : `${pendingCount} users are awaiting approval`}
          </p>
        </div>
      )}

      <UsersTable
        profiles={(profiles as Profile[]) ?? []}
        currentFilter={statusFilter ?? "all"}
        currentRole={currentUser.role}
      />
    </main>
  );
}
