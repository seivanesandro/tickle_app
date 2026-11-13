import { redirect } from "next/navigation";
import { createClient } from "@/shared/api/supabaseServer";
import { GLOBAL_DAILY_FREE_LIMIT, getGlobalDailyMessageCount } from "@/shared/api/supabaseAdmin";
import { ChatClient } from "./ChatClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ChatPage() {
  const supabase = await createClient();
  
  // 1. Fetch Auth User (SSR)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  // 2. Fetch User Profile
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // 3. Fetch Chats List
  const { data: chatsData } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // 4. Check Global Daily 50-Message Free Limit across all users today
  const globalDailyCount = await getGlobalDailyMessageCount();
  const initialDailyLimitReached = globalDailyCount >= GLOBAL_DAILY_FREE_LIMIT;

  // 5. Pass Data to Client Component (Zero Loading Screen on Browser!)
  return (
    <ChatClient 
      initialUser={userData} 
      initialChats={chatsData || []}
      initialDailyLimitReached={initialDailyLimitReached}
    />
  );
}
