import { create } from "zustand";
import { IUser } from "./types";

interface UserState {
  currentUser: IUser | null;
  isLoading: boolean;
  setCurrentUser: (user: IUser | null) => void;
  setLoading: (loading: boolean) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  isLoading: true,
  setCurrentUser: (user) => set({ currentUser: user }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearUser: () => set({ currentUser: null, isLoading: false }),
}));

