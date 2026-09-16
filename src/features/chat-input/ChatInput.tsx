"use client";

import { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Send, Loader2 } from "lucide-react";
import { ImageUploader } from "@/features/image-uploader/ImageUploader";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSendMessage: (content: string, imageBase64: string | null) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, isLoading, disabled }: ChatInputProps) {
  const [content, setContent] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const handleSend = async () => {
    if ((!content.trim() && !imageBase64) || isLoading || disabled) return;
    
    const currentContent = content;
    const currentImg = imageBase64;
    
    // Clear instantly for responsive UI
    setContent("");
    setImageBase64(null);
    
    await onSendMessage(currentContent, currentImg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full bg-card border rounded-lg p-2 flex flex-col shadow-sm focus-within:ring-1 focus-within:ring-primary transition-all">
      {/* Preview area para as imagens */}
      {imageBase64 && (
        <div className="pb-2">
          <ImageUploader 
            imageBase64={imageBase64} 
            onImageSelected={setImageBase64} 
            disabled={isLoading || disabled} 
          />
        </div>
      )}
      
      <div className="flex items-end gap-2">
        {!imageBase64 && (
          <div className="pb-1">
            <ImageUploader 
              imageBase64={imageBase64} 
              onImageSelected={setImageBase64} 
              disabled={isLoading || disabled} 
            />
          </div>
        )}
        
        <TextareaAutosize
          minRows={1}
          maxRows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Tickle AI..."
          disabled={isLoading || disabled}
          className="flex-1 resize-none bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />

        <Button
          onClick={handleSend}
          disabled={(!content.trim() && !imageBase64) || isLoading || disabled}
          className="mb-1 h-9 w-9 rounded-full p-0 shrink-0 bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
          ) : (
            <Send className="h-4 w-4 text-primary-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
}


