"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/shared/api/supabaseBrowser";
import { useUserStore } from "@/entities/user/model/store";
import { useRealtimeLimit } from "@/features/realtime-limit/useRealtimeLimit";
import { ChatSidebar } from "@/widgets/ChatSidebar";
import { ChatInput } from "@/features/chat-input/ChatInput";
import { MessageBubble } from "@/widgets/MessageBubble";
import { Loader2, Menu } from "lucide-react";
import { IChat } from "@/entities/chat/model/types";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// Tipo temporário para mostrar mensagens na UI enquanto não ligamos à BD
type TempMessage = { id: string; role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const { currentUser, setCurrentUser, isLoading, setLoading } = useUserStore();
  const [chats, setChats] = useState<IChat[]>([]);
  const [messages, setMessages] = useState<TempMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useRealtimeLimit(currentUser?.id);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    if (!content && !imageBase64) return;
    setIsSending(true);
    
    // Mostra a mensagem do utilizador imediatamente
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: content || "[Imagem enviada]" }]);

    // SIMULAÇÃO TEMPORÁRIA: Para que o ecrã não fique vazio enquanto programamos a Fase 3
    setTimeout(() => {
      setMessages((prev) => [
        ...prev, 
        { 
          id: (Date.now() + 1).toString(), 
          role: "assistant", 
          content: "*(Isto é um teste da UI visual)* A tua mensagem foi recebida! A lógica real da BD e IA será ativada no próximo passo da Fase 3." 
        }
      ]);
      setIsSending(false);
    }, 1200);
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden font-sans">
      
      {/* Sidebar Desktop */}
      <div className="hidden md:flex h-full border-r">
        <ChatSidebar chats={chats} />
      </div>
      
      <main className="flex-1 flex flex-col relative h-full max-w-full">
        {/* Header Mobile / Top Banner Desktop */}
        <div className="flex items-center justify-between p-3 border-b bg-card w-full shadow-sm">
          <div className="md:hidden">
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
          </div>
          
          {/* Top Banner c/ Logo - Fica no centro */}
          <div className="flex-1 flex justify-center md:justify-center pr-10 md:pr-0">
            <Image 
              src="/logo.jpg" 
              alt="Tickle AI Logo" 
              width={140} 
              height={40} 
              className="object-contain rounded-md"
              priority
            />
          </div>
        </div>

        {/* Zona das Mensagens (ChatWindow) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 text-muted-foreground opacity-60">
              <Image 
                src="/logo_icon.jpg" 
                alt="Tickle Icon" 
                width={80} 
                height={80} 
                className="opacity-50 grayscale rounded-2xl shadow-lg"
              />
              <div>
                <h2 className="text-2xl font-bold font-sans">Tickle AI</h2>
                <p className="mt-2 text-sm">Escreve a tua primeira mensagem abaixo para testar o Chat.</p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
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
