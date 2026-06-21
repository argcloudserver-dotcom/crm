import * as repo from "./notifications.repository";

export const listNotifications = repo.listForUser;

export async function markNotificationRead(id: string, userId: string) {
  return repo.markRead(id, userId);
}

export async function markAllNotificationsRead(userId: string) {
  await repo.markAllRead(userId);
}
