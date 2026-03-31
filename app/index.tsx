import { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@fastshot/auth';
import { Colors } from '@/constants/theme';
import { StarOfDavid } from '@/components/star-of-david';
import { TekunaLogo } from '@/components/tekuna-logo';

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered reveal: star spins in, then logo fades up, then subtitle
    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoOpacity, logoScale, subtitleOpacity]);

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)/home' as any);
      } else {
        router.replace('/(auth)/login' as any);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
      }}
    >
      <StarOfDavid size={160} />

      <Animated.View
        style={{
          alignItems: 'center',
          gap: 14,
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }}
      >
        <TekunaLogo width={280} />
      </Animated.View>

      <Animated.Text
        style={{
          fontSize: 14,
          color: Colors.textSecondary,
          opacity: subtitleOpacity,
          writingDirection: 'rtl',
          textAlign: 'center',
          letterSpacing: 0.5,
        }}
      >
        {'\u05D4\u05E9\u05E7\u05DC \u05D4\u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05E9\u05DC \u05D9\u05E9\u05E8\u05D0\u05DC'}
      </Animated.Text>
    </View>
  );
}
