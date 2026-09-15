import { create } from "zustand";
import { IChat, IMessage } from "./types";

interface ChatState {
  activeChat: IChat | null;
  messages: IMessage[];
  setActiveChat: (chat: IChat | null) => void;
  setMessages: (messages: IMessage[]) => void;
  addMessage: (message: IMessage) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeChat: null,
  messages: [],
  setActiveChat: (chat) => set({ activeChat: chat }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  clearChat: () => set({ activeChat: null, messages: [] }),
}));

