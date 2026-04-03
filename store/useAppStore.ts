import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Preferences, SessionState } from './types';

interface PreferencesSlice {
  preferences: Preferences;
}

export type AppStore = PreferencesSlice & SessionState;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      preferences: {},
      sessionId: null,
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
