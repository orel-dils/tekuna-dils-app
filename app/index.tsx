import { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@fastshot/auth';
import { Colors } from '@/constants/theme';
import { StarOfDavid } from '@/components/star-of-david';

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered text reveal
    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [titleOpacity, titleTranslateY, subtitleOpacity]);

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
        gap: 32,
      }}
    >
      <StarOfDavid size={180} />

      <View style={{ alignItems: 'center', gap: 12 }}>
        <Animated.Text
          style={{
            fontSize: 42,
            fontWeight: '800',
            color: Colors.gold,
            letterSpacing: 6,
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
            textShadowColor: Colors.goldGlow,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 20,
          }}
        >
          TEKUNA
        </Animated.Text>

        <Animated.Text
          style={{
            fontSize: 16,
            color: Colors.white,
            opacity: subtitleOpacity,
            writingDirection: 'rtl',
            textAlign: 'center',
            letterSpacing: 1,
          }}
        >
          DILS {'\u2014'} {'\u05D4\u05E9\u05E7\u05DC \u05D4\u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05E9\u05DC \u05D9\u05E9\u05E8\u05D0\u05DC'}
        </Animated.Text>
      </View>
    </View>
  );
}
