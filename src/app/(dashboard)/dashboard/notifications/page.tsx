import { requireAuth } from "@/lib/auth/dal";
import { getNotificationsAction } from "@/actions/notifications";
import { NotificationsPage } from "@/components/notifications/notifications-page";

export const metadata = { title: "Notifications -- Kunoz" };

export default async function Page() {
  const profile = await requireAuth();
  const notifications = await getNotificationsAction(100);
  return <NotificationsPage initialNotifications={notifications} />;
}
