"use client";

import { useState } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

const EMOJI_CATEGORIES = [
  {
    id: "faces",
    label: "😀",
    title: "Expressões",
    emojis: [
      "😀", "😂", "🤣", "😊", "😉", "😍", "🥰", "😘",
      "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "😏",
      "😒", "🙄", "😬", "😮‍💨", "🤔", "🤫", "🤭", "🥱",
      "😴", "🤯", "😱", "🥺", "😢", "😭", "😤", "😡"
    ],
  },
  {
    id: "spicy",
    label: "🔥",
    title: "Atrevido",
    emojis: [
      "😏", "😈", "👿", "🔥", "💋", "🥵", "🤤", "👅",
      "🫦", "🍑", "🍆", "🍒", "🍓", "🍾", "🥂", "🍷",
      "❤️‍🔥", "💕", "💘", "💝", "🖤", "💜", "👀", "🫣",
      "🤫", "⛓️", "🛏️", "🚿", "🌙", "✨", "💦", "💥"
    ],
  },
  {
    id: "gestures",
    label: "👍",
    title: "Gestos",
    emojis: [
      "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟",
      "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "✋",
      "🤚", "🖐️", "🖖", "👋", "🤝", "🙏", "💪", "🫶",
      "👏", "🙌", "👐", "🤲", "👊", "✊", "🤛", "🤜"
    ],
  },
  {
    id: "symbols",
    label: "💼",
    title: "Símbolos & Tech",
    emojis: [
      "✅", "❌", "⚡", "💡", "🚀", "💻", "📱", "🧠",
      "📊", "📈", "📌", "📎", "📝", "🔒", "🔑", "🎯",
      "🏆", "🥇", "💎", "💰", "⏰", "⏳", "🔔", "📢",
      "❓", "❗", "💯", "♻️", "🌐", "⚙️", "🛠️", "🎉"
    ],
  },
];

export function EmojiPicker({ onEmojiSelect, disabled }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);

  const currentCategory =
    EMOJI_CATEGORIES.find((cat) => cat.id === activeCategory) || EMOJI_CATEGORIES[0];

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary transition-colors"
          disabled={disabled}
          title="Adicionar emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="top"
          align="start"
          sideOffset={10}
          className="z-50 w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Abas de Categorias */}
          <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                title={cat.title}
                className={`flex-1 py-1 text-center text-lg rounded-md transition-colors ${
                  activeCategory === cat.id
                    ? "bg-primary/20 ring-1 ring-primary"
                    : "hover:bg-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
            {currentCategory.title}
          </div>

          {/* Grelha de Emojis */}
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto pr-1">
            {currentCategory.emojis.map((emoji, idx) => (
              <button
                key={`${currentCategory.id}-${idx}`}
                type="button"
                onClick={() => onEmojiSelect(emoji)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-primary/20 hover:scale-110 active:scale-95 transition-all"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
