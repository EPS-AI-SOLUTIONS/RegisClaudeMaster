import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PreferencesState {
  theme: 'dark' | 'light';
  language: 'pl' | 'en';
  setTheme: (theme: 'dark' | 'light') => void;
  setLanguage: (language: 'pl' | 'en') => void;
}

const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: getInitialTheme(),
      language: 'pl',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'regis-preferences',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
