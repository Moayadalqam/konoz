"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import type { Notification } from "@/lib/validations/notifications";

export async function getNotificationsAction(
  limit = 50
): Promise<Notification[]> {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Notification[];
}

export async function getUnreadCountAction(): Promise<{ count: number }> {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", profile.id)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
  return { count: count ?? 0 };
}

export async function markNotificationReadAction(notificationId: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", profile.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function markAllReadAction(): Promise<{ updated: number }> {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_id", profile.id)
    .eq("is_read", false)
    .select("id");

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return { updated: data?.length ?? 0 };
}

export async function deleteNotificationAction(notificationId: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("recipient_id", profile.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function notifySyncCompletionAction(syncedCount: number) {
  const profile = await requireAuth();
  const admin = createAdminClient();

  await admin.from("notifications").insert({
    recipient_id: profile.id,
    type: "sync_confirmation",
    title: "Offline check-ins synced",
    body: `${syncedCount} offline check-in${syncedCount !== 1 ? "s" : ""} synced successfully.`,
    metadata: { synced_count: syncedCount, synced_at: new Date().toISOString() },
  });
}
