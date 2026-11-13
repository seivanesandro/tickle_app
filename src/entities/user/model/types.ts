export interface IUser {
  id: string; // UUID from auth.users
  email: string;
  role: "user" | "admin";
  is_locked: boolean;
  message_count: number;
  daily_message_count?: number;
  last_message_date?: string;
  created_at: string;
}

export interface INotification {
  id: string; // UUID
  user_id: string; // UUID
  content: string;
  is_read: boolean;
  created_at: string;
}

