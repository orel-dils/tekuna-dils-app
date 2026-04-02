import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { AuthProvider } from '@fastshot/auth';
import { LoadingScreen } from '@/components/loading-screen';
import type { Session } from '@supabase/supabase-js';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);

        if (event === 'SIGNED_IN') {
          router.replace('/(tabs)/home' as any);
        }
        if (event === 'SIGNED_OUT') {
          router.replace('/(auth)/login' as any);
        }
      });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auth guard: redirect based on session state + segments
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inCallbackRoute = segments[0] === 'auth';

    if (inCallbackRoute) return; // Don't redirect during OAuth callback

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/home' as any);
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return <LoadingScreen message={'\u05D8\u05D5\u05E2\u05DF...'} />;
  }

  return (
    <AuthProvider supabaseClient={supabase}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="transaction/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
            presentation: 'card',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
