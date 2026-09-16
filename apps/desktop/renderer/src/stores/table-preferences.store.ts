import { create } from 'zustand';
import { persist } from 'zustand/middleware';
interface TablePreferences {
  order: string[];
  visibility: Record<string, boolean>;
  sizing: Record<string, number>;
  setOrder: (order: string[]) => void;
  setVisibility: (visibility: Record<string, boolean>) => void;
  setSizing: (sizing: Record<string, number>) => void;
  reset: () => void;
}
export const useTablePreferences = create<TablePreferences>()(
  persist(
    (set) => ({
      order: [],
      visibility: {},
      sizing: {},
      setOrder: (order) => set({ order }),
      setVisibility: (visibility) => set({ visibility }),
      setSizing: (sizing) => set({ sizing }),
      reset: () => set({ order: [], visibility: {}, sizing: {} }),
    }),
    {
      name: 'askod-document-table',
      version: 1,
      partialize: ({ order, visibility, sizing }) => ({
        order,
        visibility,
        sizing,
      }),
    },
  ),
);
