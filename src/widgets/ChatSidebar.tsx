"use client";

import { useState } from "react";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { IChat } from "@/entities/chat/model/types";
import { useChatStore } from "@/entities/chat/model/store";
import { createChat, deleteChat, updateChatMode } from "@/entities/chat/actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";


interface ChatSidebarProps {
  chats: IChat[];
  onSelectChat?: () => void;
}

export function ChatSidebar({ chats, onSelectChat }: ChatSidebarProps) {
  const { activeChat, setActiveChat } = useChatStore();
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateChat() {
    setIsCreating(true);
    const { success, error } = await createChat("intelectual"); // Default mode
    setIsCreating(false);

    if (success) {
      toast.success("Nova conversa criada!");
      // As props `chats` vão ser atualizadas automaticamente pelo revalidatePath
    } else {
      toast.error("Erro", { description: error });
    }
  }

  async function handleDeleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation(); // Evita selecionar a conversa quando queremos apenas apagar
    const { success, error } = await deleteChat(id);
    if (success) {
      if (activeChat?.id === id) setActiveChat(null);
      toast.success("Conversa apagada.");
    } else {
      toast.error("Erro", { description: error });
    }
  }

  async function handleModeChange(chatId: string, newMode: string) {
    const { success, error } = await updateChatMode(chatId, newMode);
    if (success) {
      if (activeChat?.id === chatId) {
        setActiveChat({ ...activeChat, mode: newMode as "intelectual" | "profissional" | "atrevido" });
      }
      toast.success("Personalidade atualizada!");
    } else {
      toast.error("Erro", { description: error });
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
          Nova Conversa
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {chats.map((chat) => (
          <div 
            key={chat.id} 
            className={`p-2 rounded-md border flex flex-col gap-2 cursor-pointer transition-colors ${
              activeChat?.id === chat.id ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
            }`}
            onClick={() => {
              setActiveChat(chat);
              if (onSelectChat) onSelectChat();
            }}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium truncate">
                <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
                {chat.title || "Conversa em branco"}
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
            
            {/* O Select impede que o click propague para a seleção do chat através de onClick interno do Shadcn */}
            <div onClick={(e) => e.stopPropagation()}>
              <Select 
                defaultValue={chat.mode} 
                onValueChange={(val) => handleModeChange(chat.id, val)}
              >
                <SelectTrigger className="h-7 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intelectual">Intelectual (Sarcástico)</SelectItem>
                  <SelectItem value="profissional">Profissional (Formal)</SelectItem>
                  <SelectItem value="atrevido">Atrevido (Livre)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {chats.length === 0 && (
          <p className="text-sm text-center text-muted-foreground mt-10 px-4">
            Ainda não tens conversas iniciadas.
          </p>
        )}
      </div>
    </div>
  );
}
