"use client";

import { useRouter } from "next/navigation";
import { Plus, Trash2, MessageSquare, LogOut } from "lucide-react";
import { IChat } from "@/entities/chat/model/types";
import { useChatStore } from "@/entities/chat/model/store";
import { useUserStore } from "@/entities/user/model/store";
import { deleteChat, updateChatMode } from "@/entities/chat/actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/shared/api/supabaseBrowser";

interface ChatSidebarProps {
  chats: IChat[];
  onSelectChat?: () => void;
  onUpdateChatMode?: (chatId: string, newMode: "intelectual" | "profissional" | "atrevido") => void;
  onDeleteChat?: (chatId: string) => void;
  onRestoreChat?: (chat: IChat) => void;
}

export function ChatSidebar({
  chats,
  onSelectChat,
  onUpdateChatMode,
  onDeleteChat,
  onRestoreChat,
}: ChatSidebarProps) {
  const router = useRouter();
  const { activeChat, setActiveChat, clearChat } = useChatStore();
  const { clearUser } = useUserStore();

  async function handleCreateChat() {
    // Limpa imediatamente a conversa ativa e as mensagens na store
    clearChat();
    if (onSelectChat) onSelectChat();
  }

  async function handleDeleteChat(chatToDelete: IChat, e: React.MouseEvent) {
    e.stopPropagation();
    const id = chatToDelete.id;

    // Remove imediatamente do estado pai (ChatClient) para nunca voltar a aparecer
    if (onDeleteChat) {
      onDeleteChat(id);
    }

    if (activeChat?.id === id) {
      clearChat();
    }

    const { success, error } = await deleteChat(id);
    if (success) {
      toast.success("Chat deleted.");
      router.refresh();
    } else {
      // Reverte apenas se der erro real no servidor
      if (onRestoreChat) {
        onRestoreChat(chatToDelete);
      }
      toast.error("Error", { description: error });
    }
  }

  async function handleModeChange(chatId: string, newMode: string) {
    const typedMode = newMode as "intelectual" | "profissional" | "atrevido";
    const { success, error } = await updateChatMode(chatId, typedMode);
    if (success) {
      if (activeChat?.id === chatId) {
        setActiveChat({ ...activeChat, mode: typedMode });
      }
      if (onUpdateChatMode) {
        onUpdateChatMode(chatId, typedMode);
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
      clearChat();
      clearUser();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.log('Erro real: ', err)
      toast.error("Error logging out");
    }
  }

  return (
    <div className="w-74 bg-card flex flex-col h-full">
      <div className="py-6 px-3">
        <Button 
          onClick={handleCreateChat} 
          className="w-full font-bold"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-2">
        {chats.map((chat) => (
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
                onClick={(e) => handleDeleteChat(chat, e)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div onClick={(e) => e.stopPropagation()}>
              <Select 
                value={chat.mode} 
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
        {chats.length === 0 && (
          <p className="text-sm text-center text-muted-foreground mt-10 px-4">
            You have no chats yet.
          </p>
        )}
      </div>

      {/* FOOTER LOGOUT */}
      <div className="p-4 mt-auto">
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

