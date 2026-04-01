import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@kunoz.sa";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "KunozAdmin2026!";

async function seedAdmin() {
  console.log("Seeding admin user...\n");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if admin already exists (idempotent)
  const { data: existingProfiles } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("role", "admin")
    .limit(1);

  if (existingProfiles && existingProfiles.length > 0) {
    console.log(`[OK] Admin already exists: ${existingProfiles[0].email}`);
    return;
  }

  // Create auth user (auto-confirms email)
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "Kunoz Admin" },
    });

  if (authError) {
    console.error("[FAIL] Failed to create auth user:", authError.message);
    process.exit(1);
  }

  console.log(`[OK] Auth user created: ${authData.user.id}`);

  // Update profile to admin + approved
  // (profile was auto-created by the handle_new_user trigger)
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      role: "admin",
      registration_status: "approved",
      full_name: "Kunoz Admin",
      position: "System Administrator",
    })
    .eq("id", authData.user.id);

  if (profileError) {
    console.error("[FAIL] Failed to update profile:", profileError.message);
    process.exit(1);
  }

  console.log("[OK] Profile updated: role=admin, status=approved");
  console.log("");
  console.log("Admin credentials:");
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log("");
  console.log("Seed complete!");
}

seedAdmin().catch(console.error);
