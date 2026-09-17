"use client";

import { useEffect } from "react";
import { createClient } from "@/shared/api/supabaseBrowser";
import { useUserStore } from "@/entities/user/model/store";
import { IUser } from "@/entities/user/model/types";
import { toast } from "sonner";

export function useRealtimeLimit(userId?: string) {
  useEffect(() => {
    if (!userId) return;
    
    const supabase = createClient();

    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new;
          
          toast.error("Rate Limit Alert", {
            description: newNotification.content,
            duration: Infinity, 
          });

          // Ler e escrever o estado atual diretamente da Store (Zustand getState) para evitar ciclos no useEffect
          const currentState = useUserStore.getState().currentUser;
          
          if (currentState) {
            useUserStore.getState().setCurrentUser({ ...currentState, is_locked: true });
          } else {
            useUserStore.getState().setCurrentUser({
              id: userId,
              is_locked: true,
              message_count: 10000,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as unknown as IUser);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
