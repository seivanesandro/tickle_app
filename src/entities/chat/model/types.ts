export interface IChat {
  id: string; // UUID
  user_id: string; // UUID
  title: string;
  mode: "intelectual" | "profissional" | "atrevido";
  created_at: string;
  updated_at: string;
}

export interface IMessage {
  id: string; // UUID
  chat_id: string; // UUID
  role: "user" | "assistant" | "system";
  content: string | null;
  created_at: string;
}

export interface IMessageImage {
  id: string; // UUID
  message_id: string; // UUID
  storage_path: string;
  created_at: string;
}

