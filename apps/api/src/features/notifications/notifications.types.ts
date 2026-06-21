export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  read: boolean;
  createdAt: string;
}
