import { create } from "zustand";

export interface SelectedReference {
  selectedReference: string | undefined;
  chatId: string | undefined;
  setSelectedReference: (value: string | undefined, chatId: string) => void;
  clearSelectedReference: () => void;
}

export const useSelectedReference = create<SelectedReference>((set) => ({
  selectedReference: undefined,
  chatId: undefined,
  setSelectedReference: (ref, chatId) =>
    set({ selectedReference: ref, chatId }),
  clearSelectedReference: () =>
    set({ selectedReference: undefined, chatId: undefined }),
}));
