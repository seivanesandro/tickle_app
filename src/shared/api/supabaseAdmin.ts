import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/shared/config/env";

export const GLOBAL_DAILY_FREE_LIMIT = 50;

export function createAdminClient() {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Garante que todas as linhas de public.users de dias anteriores (last_message_date < hoje UTC)
 * ficam com daily_message_count = 0 e last_message_date = hoje UTC na Base de Dados.
 */
export async function resetExpiredDailyCounts(): Promise<string> {
  const supabaseAdmin = createAdminClient();
  const todayUtc = new Date().toISOString().slice(0, 10);

  await supabaseAdmin
    .from("users")
    .update({ daily_message_count: 0, last_message_date: todayUtc })
    .lt("last_message_date", todayUtc);

  return todayUtc;
}

/**
 * Devolve o total global de mensagens enviadas HOJE (UTC) por todos os utilizadores juntos,
 * após garantir o reset automático a 0 caso o dia tenha mudado às 00:00 UTC.
 */
export async function getGlobalDailyMessageCount(): Promise<number> {
  const supabaseAdmin = createAdminClient();
  const todayUtc = await resetExpiredDailyCounts();

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("daily_message_count, last_message_date")
    .eq("last_message_date", todayUtc);

  if (error || !data) {
    console.error("Erro ao obter contagem diária global:", error);
    return 0;
  }

  return data.reduce((sum, u) => sum + (u.daily_message_count || 0), 0);
}
