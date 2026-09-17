import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/api/supabaseBrowser";
import { toast } from "sonner";
import { useUserStore } from "@/entities/user/model/store";

export function useIdleTimeout(timeoutMinutes: number = 30) {
  const router = useRouter();
  const { clearUser } = useUserStore();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // timeoutMinutes * 60 * 1000 converts minutes to milliseconds
      timeoutId = setTimeout(async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        clearUser();
        toast.error("Sessão expirada", { description: "Estiveste inativo durante muito tempo. Faz login novamente." });
        router.push("/login");
      }, timeoutMinutes * 60 * 1000);
    };

    // Events that reset the idle timer
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    // Initialize timer and add event listeners
    resetTimer();
    events.forEach((event) => document.addEventListener(event, resetTimer));

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [router, timeoutMinutes, clearUser]);
}
