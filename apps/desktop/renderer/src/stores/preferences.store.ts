import { create } from 'zustand';
import { persist } from 'zustand/middleware';
interface Preferences {
  compact: boolean;
  setCompact: (compact: boolean) => void;
}
export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      compact: false,
      setCompact: (compact) => set({ compact }),
    }),
    {
      name: 'askod-ui-preferences',
      version: 1,
      partialize: ({ compact }) => ({ compact }),
    },
  ),
);
