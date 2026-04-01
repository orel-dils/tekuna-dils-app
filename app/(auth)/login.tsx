import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { GoldButton } from '@/components/gold-button';
import { GoldInput } from '@/components/gold-input';
import { TekunaLogo } from '@/components/tekuna-logo';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleLogin = async () => {
    setLocalError('');

    if (!email.trim() || !password) {
      setLocalError('\u05E0\u05D0 \u05DC\u05DE\u05DC\u05D0 \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D5\u05E1\u05D9\u05E1\u05DE\u05D0');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login')) {
          setLocalError('\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D0\u05D5 \u05E1\u05D9\u05E1\u05DE\u05D0 \u05E9\u05D2\u05D5\u05D9\u05D9\u05DD');
        } else {
          setLocalError(error.message);
        }
      }
      // Navigation handled by auth state listener in _layout.tsx
    } catch (err: any) {
      setLocalError(err.message || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: Spacing.xxl,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={{
            gap: Spacing.xxxl,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Logo */}
          <View style={{ alignItems: 'center' }}>
            <TekunaLogo width={240} />
          </View>

          {/* Form */}
          <View style={{ gap: Spacing.xl }}>
            <GoldInput
              placeholder={'\u05D3\u05D5\u05D0\u05F4\u05DC'}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setLocalError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <GoldInput
              placeholder={'\u05E1\u05D9\u05E1\u05DE\u05D4'}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setLocalError('');
              }}
              isPassword
              autoComplete="password"
              textContentType="password"
            />

            {localError ? (
              <Text
                selectable
                style={{
                  color: Colors.error,
                  fontSize: 14,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                }}
              >
                {localError}
              </Text>
            ) : null}

            <GoldButton
              title={'\u05D4\u05EA\u05D7\u05D1\u05E8'}
              onPress={handleLogin}
              loading={isLoading}
            />

            <Pressable
              onPress={() => router.push('/(auth)/signup' as any)}
              hitSlop={12}
            >
              <Text
                style={{
                  color: Colors.textSecondary,
                  fontSize: 14,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                }}
              >
                {'\u05D0\u05D9\u05DF \u05DC\u05DA \u05D7\u05E9\u05D1\u05D5\u05DF? \u05D4\u05D9\u05E8\u05E9\u05DD \u05E2\u05DB\u05E9\u05D9\u05D5'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
