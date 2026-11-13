"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/api/supabaseServer";
import { createAdminClient } from "@/shared/api/supabaseAdmin";

export async function deleteUserByAdmin(targetUserId: string) {
  try {
    if (!targetUserId) {
      return { success: false, error: "ID de utilizador inválido." };
    }

    // 1. Confirmar que quem chama está autenticado
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Não autenticado." };
    }

    // 2. Proteção para o admin não apagar a própria conta
    if (targetUserId === user.id) {
      return {
        success: false,
        error: "Não podes apagar a tua própria conta de administrador.",
      };
    }

    const supabaseAdmin = createAdminClient();

    // 3. Confirmar na base de dados que quem chama tem role === 'admin'
    const { data: callerProfile, error: roleError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || callerProfile?.role !== "admin") {
      return {
        success: false,
        error: "Acesso negado. Apenas administradores podem apagar utilizadores.",
      };
    }

    // 4. Limpar ficheiros do utilizador no bucket privado 'chat_images'
    const { data: userFiles } = await supabaseAdmin.storage
      .from("chat_images")
      .list(targetUserId, { limit: 1000 });

    if (userFiles && userFiles.length > 0) {
      const pathsToRemove = userFiles.map((f) => `${targetUserId}/${f.name}`);
      await supabaseAdmin.storage.from("chat_images").remove(pathsToRemove);
    }

    // 5. Apagar o registo em public.users (faz CASCADE de chats, messages, message_images e notifications)
    const { error: deletePublicError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", targetUserId);

    if (deletePublicError) {
      return {
        success: false,
        error: `Erro ao remover perfil: ${deletePublicError.message}`,
      };
    }

    // 6. Apagar a conta de autenticação em auth.users
    const { error: deleteAuthError } =
      await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteAuthError) {
      return {
        success: false,
        error: `Perfil removido, mas ocorreu um aviso no Auth: ${deleteAuthError.message}`,
      };
    }

    revalidatePath("/admin");
    revalidatePath("/chat");
    return { success: true };
  } catch {
    return { success: false, error: "Erro interno ao apagar utilizador." };
  }
}
