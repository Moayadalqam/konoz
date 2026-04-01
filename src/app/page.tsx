import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/dal";

export default async function Home() {
  const profile = await getProfile();

  if (profile && profile.registration_status === "approved") {
    redirect("/dashboard");
  }

  redirect("/login");
}
