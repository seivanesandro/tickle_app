"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/shared/api/supabaseBrowser";
import { useUserStore } from "@/entities/user/model/store";
import { useChatStore } from "@/entities/chat/model/store";
import { createChat, updateChatMode } from "@/entities/chat/actions";
import { useRealtimeLimit } from "@/features/realtime-limit/useRealtimeLimit";
import { useIdleTimeout } from "@/features/auth/useIdleTimeout";
import { ChatSidebar } from "@/widgets/ChatSidebar";
import { ChatInput } from "@/features/chat-input/ChatInput";
import { MessageBubble } from "@/widgets/MessageBubble";
import { Loader2, Menu } from "lucide-react";
import { IChat, IMessage } from "@/entities/chat/model/types";
import { IUser } from "@/entities/user/model/types";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ClientOnly } from "@/shared/lib/ClientOnly";
import { toast } from "sonner";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

interface ChatClientProps {
  initialUser: IUser | null;
  initialChats: IChat[];
}

export function ChatClient({ initialUser, initialChats }: ChatClientProps) {
  const router = useRouter();

  // Singleton Pattern: Memorizar o cliente do Supabase para evitar instâncias duplicadas (Leak fix)
  const supabase = useMemo(() => createClient(), []);
  
  const { currentUser, setCurrentUser, isLoading, setLoading } = useUserStore();
  const { activeChat, setActiveChat, messages, setMessages, addMessage } = useChatStore();
  
  // Iniciar o estado com as props que vÃªm do Server Component (0ms de espera)
  const [chats, setChats] = useState<IChat[]>(initialChats);
  const [isSending, setIsSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"intelectual" | "profissional" | "atrevido">("intelectual");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const skipNextFetchRef = useRef(false);

  // Inicializar Zustand stores no Client
  useEffect(() => {
    if (initialUser && !currentUser) {
      setCurrentUser(initialUser);
    }
    setLoading(false);
  }, [initialUser, currentUser, setCurrentUser, setLoading]);

  useRealtimeLimit(currentUser?.id);

  // Iniciar timer de inatividade de 30 minutos
  useIdleTimeout(30);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Load messages when a chat is selected
  useEffect(() => {
    async function loadMessages() {
      if (!activeChat) {
        setMessages([]);
        return;
      }
      if (skipNextFetchRef.current) {
        skipNextFetchRef.current = false;
        return;
      }
      const { data, error } = await supabase
        .from("messages")
        .select("*, message_images(storage_path)")
        .eq("chat_id", activeChat.id)
        .order("created_at", { ascending: true });
        
      if (!error && data) {
        // Formatar para bater certo com a tipagem da UI e gerar Signed URLs para imagens
        const formattedMessages = await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.map(async (msg: any) => {
            let signedImageUrl: string | null = null;
            const storagePath = Array.isArray(msg.message_images)
              ? msg.message_images[0]?.storage_path
              : msg.message_images?.storage_path;

            if (storagePath) {
              const { data: signedData } = await supabase.storage
                .from("chat_images")
                .createSignedUrl(storagePath, 3600);
              signedImageUrl = signedData?.signedUrl || null;
            }

            return {
              id: msg.id,
              chat_id: msg.chat_id,
              role: msg.role,
              content: msg.content,
              created_at: msg.created_at,
              imageUrl: signedImageUrl,
            } as IMessage;
          })
        );
        setMessages(formattedMessages);
      }
    }
    loadMessages();
  }, [activeChat, supabase, setMessages]);

  async function handleSendMessage(content: string, imageBase64: string | null) {
    if (!content && !imageBase64) return;
    setIsSending(true);

    let currentChatId = activeChat?.id;
    const currentMode = activeChat?.mode || selectedMode;

    // 1. UI Otimista: mostra a mensagem do utilizador IMEDIATAMENTE (sem esperar pela Base de Dados)
    const tempId = Date.now().toString();
    const uiChatId = currentChatId || "temp-chat";
    addMessage({ 
      id: tempId, 
      chat_id: uiChatId, 
      role: "user", 
      content: content || null, 
      created_at: new Date().toISOString(),
      imageUrl: imageBase64
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
      skipNextFetchRef.current = true;
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

      // Se a sessão expirou durante a noite (401), expulsa o utilizador de volta para o login suavemente
      if (res.status === 401) {
        toast.error("Session expired", { description: "Please log in again." });
        router.push("/login");
        return;
      }

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
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <Image 
                    src="/logo.jpg" 
                    alt="Tickle Icon" 
                    width={100} 
                    height={100} 
                    className="opacity-50 grayscale rounded-2xl shadow-lg w-[60px] md:w-[70px] lg:w-[90px] xl:w-[110px] h-auto transition-all object-contain" priority />
                  <div className="text-muted-foreground opacity-80">
                    <h2 className="text-2xl font-bold font-sans text-foreground">Tickle AI</h2>
                    <p className="mt-2 text-sm">Choose your assistant personality below and send your first message.</p>
                  </div>

                  {/* Seletor de Personalidade antes da 1ª mensagem */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl pt-2">
                    {[
                      {
                        id: "intelectual" as const,
                        emoji: "🧠",
                        title: "Intellectual",
                        desc: "Sarcastic, witty & sharp",
                      },
                      {
                        id: "profissional" as const,
                        emoji: "💼",
                        title: "Professional",
                        desc: "Formal, direct & objective",
                      },
                      {
                        id: "atrevido" as const,
                        emoji: "🌶️",
                        title: "Saucy",
                        desc: "Bold, seductive & uncensored",
                      },
                    ].map((item) => {
                      const activeMode = activeChat?.mode || selectedMode;
                      const isSelected = activeMode === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={async () => {
                            setSelectedMode(item.id);
                            if (activeChat) {
                              setActiveChat({ ...activeChat, mode: item.id });
                              setChats((prev) =>
                                prev.map((c) => (c.id === activeChat.id ? { ...c, mode: item.id } : c))
                              );
                              await updateChatMode(activeChat.id, item.id);
                            }
                          }}
                          className={`flex flex-col items-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(57,255,20,0.2)] scale-[1.02]"
                              : "border-border bg-card/60 hover:border-primary/40 hover:bg-accent/50 opacity-75 hover:opacity-100"
                          }`}
                        >
                          <span className="text-2xl mb-1.5">{item.emoji}</span>
                          <span className={`text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {item.title}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1">
                            {item.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.map((msg) => (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <MessageBubble key={msg.id} message={msg as any} imageUrl={msg.imageUrl || undefined} />
                  ))}

                  {isSending && (
                    <div className="flex w-full justify-start mb-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <style>{`
                        @keyframes tickleWave {
                          0%, 100% { transform: scaleY(0.25); opacity: 0.5; }
                          50% { transform: scaleY(1); opacity: 1; }
                        }
                      `}</style>
                      <div className="flex max-w-[85%] sm:max-w-[75%] flex-row gap-3 items-center">
                        <Avatar className="h-8 w-8 shrink-0 border border-primary/50 shadow-[0_0_12px_rgba(57,255,20,0.35)]">
                          <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                            AI
                          </AvatarFallback>
                        </Avatar>

                        {/* Equalizador de Ondas Sonoras Cyberpunk / Voice AI */}
                        <div className="flex items-center gap-3 rounded-xl rounded-tl-none bg-muted/90 px-4 py-3 shadow-[0_0_15px_rgba(57,255,20,0.1)] border border-primary/30">
                          <div className="flex items-center gap-[3px] h-6">
                            {[0, 150, 300, 100, 250, 400, 180, 320, 80, 220, 360, 120].map((delay, i) => (
                              <span
                                key={i}
                                style={{
                                  animation: `tickleWave 0.9s ease-in-out infinite`,
                                  animationDelay: `${delay}ms`,
                                }}
                                className="w-[1.5px] h-5 rounded-full bg-primary shadow-[0_0_6px_#39FF14] origin-center"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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







