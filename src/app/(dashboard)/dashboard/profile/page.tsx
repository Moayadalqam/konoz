import { requireAuth } from "@/lib/auth/dal";
import { ProfileView } from "@/components/profile/profile-view";

export const metadata = {
  title: "My Profile -- Kunoz",
};

export default async function ProfilePage() {
  const profile = await requireAuth();

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and update your personal information
        </p>
      </div>

      <ProfileView profile={profile} />
    </div>
  );
}
