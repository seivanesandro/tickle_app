const fs = require('fs');

const code = `"use server";

import { createClient } from "@/shared/api/supabaseServer";
import { revalidatePath } from "next/cache";

export async function createChat(mode: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Não autenticado." };

    const { data, error } = await supabase
      .from("chats")
      .insert({ user_id: user.id, mode: mode })
      .select("id")
      .single();

    if (error || !data) return { success: false, error: error?.message || "Erro ao criar conversa." };

    revalidatePath("/chat");
    return { success: true, id: data.id };
  } catch {
    return { success: false, error: "Erro interno no servidor." };
  }
}

export async function deleteChat(chatId: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Não autenticado." };

    const { error } = await supabase
      .from("chats")
      .delete()
      .eq("id", chatId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/chat");
    return { success: true };
  } catch {
    return { success: false, error: "Erro interno no servidor." };
  }
}

export async function updateChatMode(chatId: string, mode: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Não autenticado." };

    const { error } = await supabase
      .from("chats")
      .update({ mode })
      .eq("id", chatId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/chat");
    return { success: true };
  } catch {
    return { success: false, error: "Erro interno no servidor." };
  }
}
`;

fs.writeFileSync('src/entities/chat/actions.ts', code, 'utf8');

