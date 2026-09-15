"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/api/supabaseBrowser";
import { useUserStore } from "@/entities/user/model/store";
import { useRealtimeLimit } from "@/features/realtime-limit/useRealtimeLimit";
import { ChatSidebar } from "@/widgets/ChatSidebar";
import { ChatInput } from "@/features/chat-input/ChatInput";
import { Loader2, Menu } from "lucide-react";
import { IChat } from "@/entities/chat/model/types";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const { currentUser, setCurrentUser, isLoading, setLoading } = useUserStore();
  const [chats, setChats] = useState<IChat[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useRealtimeLimit(currentUser?.id);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (userData) {
        setCurrentUser(userData);
      }

      const { data: chatsData } = await supabase
        .from("chats")
        .select("*")
        .order("updated_at", { ascending: false });

      if (chatsData) {
        setChats(chatsData);
      }

      setLoading(false);
    }
    
    loadInitialData();
  }, [supabase, router, setCurrentUser, setLoading]);

  async function handleSendMessage(content: string, imageBase64: string | null) {
    setIsSending(true);
    console.log("Enviando...", { content, imageBase64 });
    await new Promise((r) => setTimeout(r, 1000));
    setIsSending(false);
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    // Usa-se 100dvh para que o layout se ajuste perfeitamente aos teclados mobile (Safari/Chrome)
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      
      {/* Sidebar para Ecrãs Grandes (Desktop) */}
      <div className="hidden md:flex h-full border-r">
        <ChatSidebar chats={chats} />
      </div>
      
      <main className="flex-1 flex flex-col relative h-full max-w-full">
        {/* Header para Mobile com Menu Hamburguer */}
        <div className="md:hidden flex items-center p-3 border-b bg-card">
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
              <ChatSidebar chats={chats} onSelectChat={() => setIsSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="font-bold text-lg text-primary">Tickle AI</h1>
        </div>

        {/* Zona das Mensagens (Placeholder do ChatWindow) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground opacity-50">
            <h2 className="text-xl font-bold">Tickle AI</h2>
            <p>Selecione ou inicie uma nova conversa na barra lateral.</p>
          </div>
        </div>

        {/* Zona do Input na base da janela */}
        <div className="p-4 mx-auto w-full max-w-3xl">
          <ChatInput 
            onSendMessage={handleSendMessage} 
            isLoading={isSending} 
            disabled={currentUser?.is_locked} 
          />
        </div>
      </main>
    </div>
  );
}
