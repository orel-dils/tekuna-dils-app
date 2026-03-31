import { AuthCallbackPage } from '@fastshot/auth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function Callback() {
  const router = useRouter();
  return (
    <AuthCallbackPage
      supabaseClient={supabase}
      onSuccess={() => router.replace('/(tabs)/home' as any)}
      onError={(error) =>
        router.replace(`/(auth)/login?error=${encodeURIComponent(error.message)}` as any)
      }
      loadingText="Completing sign in..."
    />
  );
}
