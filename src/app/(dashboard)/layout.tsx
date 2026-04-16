import { requireAuth } from "@/lib/auth/dal";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { DashboardPwaWrapper } from "@/components/pwa/dashboard-pwa-wrapper";
import { WelcomeOverlay } from "@/components/dashboard/welcome-overlay";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();

  return (
    <DashboardPwaWrapper>
      <WelcomeOverlay name={profile.full_name} role={profile.role} />
      <div className="flex min-h-dvh bg-background">
        {/* Sidebar — desktop + tablet only */}
        <aside className="hidden md:block w-60 shrink-0">
          <Sidebar profile={profile} />
        </aside>

        {/* Main content area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Topbar — desktop + tablet only */}
          <div className="hidden md:block">
            <Topbar profile={profile} />
          </div>

          {/* Page content */}
          <main className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <MobileNav profile={profile} />
      </div>
    </DashboardPwaWrapper>
  );
}
