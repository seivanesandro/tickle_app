import { redirect } from "next/navigation";
import { createClient } from "@/shared/api/supabaseServer";
import {
  createAdminClient,
  GLOBAL_DAILY_FREE_LIMIT,
  resetExpiredDailyCounts,
} from "@/shared/api/supabaseAdmin";
import { AdminClient } from "./AdminClient";
import { IUser } from "@/entities/user/model/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminPage() {
  const supabase = await createClient();

  // 1. Verificar autenticação
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const supabaseAdmin = createAdminClient();

  // 2. Verificar se o utilizador autenticado tem role === 'admin'
  const { data: currentProfile } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!currentProfile || currentProfile.role !== "admin") {
    redirect("/chat");
  }

  // 3. Garantir reset automático de daily_message_count a 0 para todos os utilizadores se mudou o dia (00:00 UTC)
  await resetExpiredDailyCounts();

  // 4. Obter todos os utilizadores registados (usando Service Role para contornar RLS de utilizador individual)
  const { data: allUsersData } = await supabaseAdmin
    .from("users")
    .select(
      "id, email, role, is_locked, message_count, daily_message_count, last_message_date, created_at"
    )
    .order("created_at", { ascending: false });

  const allUsers: IUser[] = (allUsersData as IUser[]) || [];

  return (
    <AdminClient
      currentAdminId={user.id}
      initialUsers={allUsers}
      dailyLimit={GLOBAL_DAILY_FREE_LIMIT}
    />
  );
}
