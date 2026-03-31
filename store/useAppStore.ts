import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Preferences } from './types';

interface PreferencesSlice {
  preferences: Preferences;
}

export type AppStore = PreferencesSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      preferences: {},
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);
