"use server";

import { createClient } from "@/shared/api/supabaseServer";
import { revalidatePath } from "next/cache";

export async function createChat(mode: string) {
  try {
    const supabase = await createClient();
    
    // Validar quem é o utilizador que está a pedir isto
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: "Não autenticado." };
    }

    // Inserir a linha na tabela public.chats
    // O Supabase gera automaticamente o UUID, createdAt, etc (definido no schema db.md)
    const { data, error } = await supabase
      .from("chats")
      .insert({
        user_id: user.id,
        mode: mode,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Erro ao criar nova conversa." };
    }

    revalidatePath("/chat"); // Força o Next.js a atualizar as listas de chats cacheadas
    return { success: true, id: data.id };
  } catch {
    return { success: false, error: "Erro interno no servidor." };
  }
}

export async function deleteChat(chatId: string) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: "Não autenticado." };
    }

    // O ON DELETE CASCADE na BD (ver db.md) tratará de apagar as mensagens e as imagens associadas.
    // O RLS da DB impede que alguém apague chats de outras pessoas, 
    // mas reforçamos a lógica filtrando pelo user_id do lado do backend
    const { error } = await supabase
      .from("chats")
      .delete()
      .eq("id", chatId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

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
    if (!user) return { success: false, error: "N�o autenticado." };

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
