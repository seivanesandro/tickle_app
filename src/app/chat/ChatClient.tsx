"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/shared/api/supabaseBrowser";
import { useUserStore } from "@/entities/user/model/store";
import { useChatStore } from "@/entities/chat/model/store";
import { createChat } from "@/entities/chat/actions";
import { useRealtimeLimit } from "@/features/realtime-limit/useRealtimeLimit";
import { ChatSidebar } from "@/widgets/ChatSidebar";
import { ChatInput } from "@/features/chat-input/ChatInput";
import { MessageBubble } from "@/widgets/MessageBubble";
import { Loader2, Menu } from "lucide-react";
import { IChat, IMessage } from "@/entities/chat/model/types";
import { IUser } from "@/entities/user/model/types";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/shared/lib/ClientOnly";
import { toast } from "sonner";
import { useMemo } from "react";

interface ChatClientProps {
  initialUser: IUser | null;
  initialChats: IChat[];
}

export function ChatClient({ initialUser, initialChats }: ChatClientProps) {
  // Singleton Pattern: Memorizar o cliente do Supabase para evitar instÃ¢ncias duplicadas (Leak fix)
  const supabase = useMemo(() => createClient(), []);
  
  const { currentUser, setCurrentUser, isLoading, setLoading } = useUserStore();
  const { activeChat, setActiveChat, messages, setMessages, addMessage } = useChatStore();
  
  // Iniciar o estado com as props que vÃªm do Server Component (0ms de espera)
  const [chats, setChats] = useState<IChat[]>(initialChats);
  const [isSending, setIsSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Inicializar Zustand stores no Client
  useEffect(() => {
    if (initialUser && !currentUser) {
      setCurrentUser(initialUser);
    }
    setLoading(false);
  }, [initialUser, currentUser, setCurrentUser, setLoading]);

  useRealtimeLimit(currentUser?.id);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when a chat is selected
  useEffect(() => {
    async function loadMessages() {
      if (!activeChat) {
        setMessages([]);
        return;
      }
      const { data, error } = await supabase
        .from("messages")
        .select("*, message_images(storage_path)")
        .eq("chat_id", activeChat.id)
        .order("created_at", { ascending: true });
        
      if (!error && data) {
        // Formatar para bater certo com a tipagem da UI
        const formattedMessages = data.map(msg => ({
          id: msg.id,
          chat_id: msg.chat_id,
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
        })) as IMessage[];
        setMessages(formattedMessages);
      }
    }
    loadMessages();
  }, [activeChat, supabase, setMessages]);

  async function handleSendMessage(content: string, imageBase64: string | null) {
    if (!content && !imageBase64) return;
    setIsSending(true);

    let currentChatId = activeChat?.id;
    const currentMode = activeChat?.mode || "intelectual";

    // 1. UI Otimista: mostra a mensagem do utilizador IMEDIATAMENTE (sem esperar pela Base de Dados)
    const tempId = Date.now().toString();
    const uiChatId = currentChatId || "temp-chat";
    addMessage({ 
      id: tempId, 
      chat_id: uiChatId, 
      role: "user", 
      content: content || "[Image sent]", 
      created_at: new Date().toISOString() 
    });

    // 2. Criar a conversa na Base de Dados se ainda nÃ£o existir
    if (!currentChatId) {
      const { success, id, error } = await createChat(currentMode);
      if (!success || !id) {
        toast.error("Error creating new chat", { description: error });
        setIsSending(false);
        return;
      }
      currentChatId = id;
      
      // Adiciona o novo chat Ã  barra lateral subtilmente
      const newChat = { id, user_id: currentUser!.id, title: "New Chat", mode: currentMode as "intelectual", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      setChats(prev => [newChat, ...prev]);
      setActiveChat(newChat);
    }
    
    // 3. Chamar a IA (a lentidÃ£o do servidor acontece em background, enquanto a UI jÃ¡ estÃ¡ a carregar o balÃ£o)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: currentChatId,
          mode: currentMode,
          content,
          imageBase64
        })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("AI Error", { description: data.error || "Try again." });
      } else {
        // Adiciona a resposta real da BD e da IA ÃƒÂ  store
        addMessage({ id: (Date.now() + 1).toString(), chat_id: currentChatId as string, role: "assistant", content: data.content, created_at: new Date().toISOString() });
      }
    } catch (err) {
      console.log('O erro gerado: ', err)
      toast.error("Connection error", { description: "Could not contact the server." });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <ClientOnly>
      {isLoading ? (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex h-[100dvh] w-full bg-background overflow-hidden font-sans">
          
          <div className="hidden md:flex h-full border-r">
            <ChatSidebar chats={chats} />
          </div>
          
          <main className="flex-1 flex flex-col relative h-full max-w-full">
            <div className="flex items-center justify-between p-3 border-b bg-card w-full shadow-sm">
              <div className="md:hidden">
                <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="mr-2">
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Open Menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-4/5" showCloseButton={false}>
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <ChatSidebar chats={chats} onSelectChat={() => setIsSidebarOpen(false)} />
                  </SheetContent>
                </Sheet>
              </div>
              
              <div className="flex-1 flex justify-center md:justify-center pr-10 md:pr-0">
                {/* Mobile: Sem texto (Apenas a face do logo cortada por CSS) */}
                <div className="block md:hidden w-[45px] aspect-[1/0.75] overflow-hidden rounded-md">
                  <Image 
                    src="/logo.jpg" 
                    alt="Tickle AI Logo" 
                    width={100} 
                    height={100} 
                    className="w-full h-auto object-cover object-top"
                    priority
                  />
                </div>
                {/* Desktop: Logo completo com o texto TICKLE */}
                <Image 
                  src="/logo.jpg" 
                  alt="Tickle AI Logo Completo" 
                  width={140} 
                  height={40} 
                  className="hidden md:block object-contain rounded-md md:w-[60px] lg:w-[70px] xl:w-[80px] 2xl:w-[90px] h-auto transition-all"
                  priority
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6 text-muted-foreground opacity-60">
                  <Image 
                    src="/logo.jpg" 
                    alt="Tickle Icon" 
                    width={100} 
                    height={100} 
                    className="opacity-50 grayscale rounded-2xl shadow-lg w-[60px] md:w-[70px] lg:w-[90px] xl:w-[110px] h-auto transition-all object-contain" priority />
                  <div>
                    <h2 className="text-2xl font-bold font-sans">Tickle AI</h2>
                    <p className="mt-2 text-sm">Write your first message below to test true Artificial Intelligence.</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.map((msg) => (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <MessageBubble key={msg.id} message={msg as any} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="p-4 mx-auto w-full max-w-3xl">
              <ChatInput 
                onSendMessage={handleSendMessage} 
                isLoading={isSending} 
                disabled={currentUser?.is_locked} 
              />
            </div>
          </main>
        </div>
      )}
    </ClientOnly>
  );
}







