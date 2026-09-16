"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, MessageSquare, LogOut } from "lucide-react";
import { IChat } from "@/entities/chat/model/types";
import { useChatStore } from "@/entities/chat/model/store";
import { createChat, deleteChat, updateChatMode } from "@/entities/chat/actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/shared/api/supabaseBrowser";

interface ChatSidebarProps {
  chats: IChat[];
  onSelectChat?: () => void;
}

export function ChatSidebar({ chats, onSelectChat }: ChatSidebarProps) {
  const router = useRouter();
  const { activeChat, setActiveChat } = useChatStore();
  const [isCreating, setIsCreating] = useState(false);
  
  // React Best Practice: Em vez de duplicar o array e usar useEffect (que causa cascading renders),
  // guardamos apenas os IDs dos chats apagados de forma otimista.
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Calculamos os chats visíveis durante o render
  const visibleChats = chats.filter(chat => !deletedIds.has(chat.id));

  async function handleCreateChat() {
    setIsCreating(true);
    const { success, error } = await createChat("intelectual"); // Default mode
    setIsCreating(false);

    if (success) {
      toast.success("New chat created!");
      router.refresh();
    } else {
      toast.error("Error", { description: error });
    }
  }

  async function handleDeleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation(); 
    
    // Optimistic UI Update: Apaga imediatamente adicionando ao set de apagados
    setDeletedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    
    if (activeChat?.id === id) setActiveChat(null);

    const { success, error } = await deleteChat(id);
    if (success) {
      toast.success("Chat deleted.");
      router.refresh();
    } else {
      // Reverte se der erro no servidor
      setDeletedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error("Error", { description: error });
    }
  }

  async function handleModeChange(chatId: string, newMode: string) {
    const { success, error } = await updateChatMode(chatId, newMode);
    if (success) {
      if (activeChat?.id === chatId) {
        setActiveChat({ ...activeChat, mode: newMode as "intelectual" | "profissional" | "atrevido" });
      }
      toast.success("Personality updated!");
    } else {
      toast.error("Error", { description: error });
    }
  }

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setActiveChat(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.log('Erro real: ', err)
      toast.error("Error logging out");
    }
  }

  return (
    <div className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <Button 
          onClick={handleCreateChat} 
          disabled={isCreating} 
          className="w-full font-bold"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {visibleChats.map((chat) => (
          <div 
            key={chat.id} 
            className={cn("p-2 rounded-md border flex flex-col gap-2 cursor-pointer transition-colors", activeChat?.id === chat.id ? "bg-primary/10 border-primary" : "hover:bg-accent")}
            onClick={() => {
              setActiveChat(chat);
              if (onSelectChat) onSelectChat();
            }}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium truncate">
                <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
                {chat.title || "Empty chat"}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-muted-foreground hover:text-red-500 shrink-0"
                onClick={(e) => handleDeleteChat(chat.id, e)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div onClick={(e) => e.stopPropagation()}>
              <Select 
                defaultValue={chat.mode} 
                onValueChange={(val) => handleModeChange(chat.id, val)}
              >
                <SelectTrigger className="h-7 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intelectual">Intellectual (Sarcastic)</SelectItem>
                  <SelectItem value="profissional">Professional (Formal)</SelectItem>
                  <SelectItem value="atrevido">Saucy (Uncensored)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {visibleChats.length === 0 && (
          <p className="text-sm text-center text-muted-foreground mt-10 px-4">
            You have no chats yet.
          </p>
        )}
      </div>

      {/* FOOTER LOGOUT */}
      <div className="p-4 border-t mt-auto">
        <Button 
          variant="outline" 
          className="w-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors" 
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
