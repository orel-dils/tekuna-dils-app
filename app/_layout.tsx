import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';
import { AuthProvider } from '@fastshot/auth';
import { LoadingScreen } from '@/components/loading-screen';
import { useAppStore } from '@/store/useAppStore';
import type { Session, User } from '@supabase/supabase-js';

const startSession = async (user: User) => {
  try {
    let lat: number | null = null;
    let lng: number | null = null;
    let consent = false;

    // Request location permission (works on web + native)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
        consent = true;
      }
    } catch {
      // Location unavailable — proceed without it
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const res = await fetch(
      process.env.EXPO_PUBLIC_SUPABASE_URL +
        '/functions/v1/mobile-events/session-start',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          platform: Platform.OS,
          app_version: '1.0.0',
          device_model: Device.modelName,
          location_lat: lat,
          location_lng: lng,
          location_consent: consent,
        }),
      }
    );

    const data = await res.json();
    if (data.session_id) {
      useAppStore.setState({ sessionId: data.session_id });
    }
  } catch (e) {
    console.log('Session start:', e);
  }
};

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

          // Fire session-start in background after login
          if (session?.user) {
            startSession(session.user);
          }
        }
        if (event === 'SIGNED_OUT') {
          useAppStore.setState({ sessionId: null });
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
    const inTabsGroup = segments[0] === '(tabs)';

    if (inCallbackRoute) return; // Don't redirect during OAuth callback

    if (!session && !inAuthGroup) {
      // Not logged in and not on auth screen → go to login
      router.replace('/(auth)/login' as any);
    } else if (session && !inTabsGroup && segments[0] !== 'transaction') {
      // Logged in but stuck on splash/auth → go to home
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
