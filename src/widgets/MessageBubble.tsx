"use client";

import ReactMarkdown from "react-markdown";
import { IMessage } from "@/entities/chat/model/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MessageBubbleProps {
  message: IMessage;
  imageUrl?: string; // Caso a mensagem tenha imagem associada (do public.message_images)
}

export function MessageBubble({ message, imageUrl }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-6`}>
      <div className={`flex max-w-[85%] sm:max-w-[75%] ${isUser ? "flex-row-reverse" : "flex-row"} gap-3`}>
        
        {/* Avatar */}
        <Avatar className="h-8 w-8 shrink-0 border border-primary/20">
          {isUser ? (
            <AvatarFallback className="bg-primary/20 text-primary text-xs">TU</AvatarFallback>
          ) : (
            <>
              {/* O Tickle AI tem cor verde fluorescente na identidade */}
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">AI</AvatarFallback>
            </>
          )}
        </Avatar>

        {/* Bubble Content */}
        <div 
          className={`flex flex-col gap-2 rounded-lg px-4 py-3 text-sm shadow-sm ${
            isUser 
              ? "bg-primary text-primary-foreground rounded-tr-none" 
              : "bg-muted text-foreground rounded-tl-none border border-border"
          }`}
        >
          {imageUrl && (
            <div className="mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imageUrl} 
                alt="Imagem carregada" 
                className="max-h-64 rounded-md object-contain bg-black/10" 
              />
            </div>
          )}

          {message.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
              {/* react-markdown padrão já impede HTML bruto se não usarmos rehypeRaw */}
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
