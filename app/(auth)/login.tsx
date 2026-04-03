import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@fastshot/auth';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { GoldButton } from '@/components/gold-button';
import { GoldInput } from '@/components/gold-input';
import { TekunaLogo } from '@/components/tekuna-logo';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithGoogle, isLoading: oauthLoading } = useAuth();
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

  const getErrorMessage = (errorMsg: string): string => {
    if (
      errorMsg.includes('Invalid API') ||
      errorMsg.includes('api key') ||
      errorMsg.includes('apikey')
    ) {
      return '\u05E9\u05D2\u05D9\u05D0\u05EA \u05D7\u05D9\u05D1\u05D5\u05E8 \u2014 \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1';
    }
    if (
      errorMsg.includes('Invalid login') ||
      errorMsg.includes('invalid_credentials')
    ) {
      return '\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D0\u05D5 \u05E1\u05D9\u05E1\u05DE\u05D0 \u05E9\u05D2\u05D5\u05D9\u05D9\u05DD';
    }
    if (errorMsg.includes('Email not confirmed')) {
      return '\u05E0\u05D0 \u05DC\u05D0\u05DE\u05EA \u05D0\u05EA \u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05EA\u05D7\u05D9\u05DC\u05D4';
    }
    if (errorMsg.includes('Too many requests')) {
      return '\u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9 \u05E0\u05D9\u05E1\u05D9\u05D5\u05E0\u05D5\u05EA \u2014 \u05D4\u05DE\u05EA\u05DF \u05D3\u05E7\u05D4';
    }
    if (errorMsg.includes('Network') || errorMsg.includes('fetch')) {
      return '\u05D1\u05E2\u05D9\u05D9\u05EA \u05D7\u05D9\u05D1\u05D5\u05E8 \u05DC\u05D0\u05D9\u05E0\u05D8\u05E8\u05E0\u05D8';
    }
    return '\u05D0\u05D9\u05E8\u05E2\u05D4 \u05E9\u05D2\u05D9\u05D0\u05D4 \u2014 \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1';
  };

  const logAuthError = async (errorMsg: string, userEmail: string) => {
    try {
      await supabase.from('app_events').insert({
        event_name: 'auth_error',
        platform: Platform.OS,
        screen_name: 'login',
        metadata: {
          error_code: errorMsg,
          email_domain: userEmail.split('@')[1] || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      // Silent fail — logging must never block UX
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setLocalError('\u05E0\u05D0 \u05DC\u05DE\u05DC\u05D0 \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D5\u05E1\u05D9\u05E1\u05DE\u05D0');
      return;
    }

    setIsLoading(true);
    setLocalError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setLocalError(getErrorMessage(error.message));
        await logAuthError(error.message, email);
      }
      // Success -> _layout.tsx onAuthStateChange handles redirect
    } catch {
      setLocalError('\u05E9\u05D2\u05D9\u05D0\u05EA \u05D7\u05D9\u05D1\u05D5\u05E8 \u2014 \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError('');
    try {
      await signInWithGoogle();
    } catch {
      setLocalError('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05E2\u05DD Google');
    }
  };

  // Apple button -> Google OAuth for now until Apple mechanism is built
  const handleAppleLogin = async () => {
    setLocalError('');
    try {
      await signInWithGoogle();
    } catch {
      setLocalError('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05E2\u05DD Apple');
    }
  };

  const anyLoading = isLoading || oauthLoading;

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
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
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

          {/* Title */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: Colors.gold,
              textAlign: 'right',
              writingDirection: 'rtl',
            }}
          >
            {'\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA'}
          </Text>

          {/* Social Login Buttons */}
          <View style={{ gap: Spacing.md }}>
            {/* Google Button */}
            <Pressable
              onPress={handleGoogleLogin}
              disabled={anyLoading}
              style={({ pressed }) => ({
                flexDirection: 'row-reverse',
                alignItems: 'center',
                justifyContent: 'center',
                gap: Spacing.md,
                backgroundColor: Colors.white,
                borderRadius: Radius.lg,
                borderCurve: 'continuous',
                paddingVertical: 14,
                paddingHorizontal: Spacing.xxl,
                minHeight: 52,
                opacity: anyLoading ? 0.5 : pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="logo-google" size={20} color="#1F1F1F" />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1F1F1F',
                  writingDirection: 'rtl',
                }}
              >
                {'\u05D4\u05DE\u05E9\u05DA \u05E2\u05DD Google'}
              </Text>
            </Pressable>

            {/* Apple Button */}
            <Pressable
              onPress={handleAppleLogin}
              disabled={anyLoading}
              style={({ pressed }) => ({
                flexDirection: 'row-reverse',
                alignItems: 'center',
                justifyContent: 'center',
                gap: Spacing.md,
                backgroundColor: Colors.white,
                borderRadius: Radius.lg,
                borderCurve: 'continuous',
                paddingVertical: 14,
                paddingHorizontal: Spacing.xxl,
                minHeight: 52,
                opacity: anyLoading ? 0.5 : pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="logo-apple" size={22} color="#000" />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1F1F1F',
                  writingDirection: 'rtl',
                }}
              >
                {'\u05D4\u05DE\u05E9\u05DA \u05E2\u05DD Apple'}
              </Text>
            </Pressable>
          </View>

          {/* Divider between social and email */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.md,
            }}
          >
            <View
              style={{
                flex: 1,
                height: 0.5,
                backgroundColor: Colors.cardBorder,
              }}
            />
            <Text
              style={{
                color: Colors.textTertiary,
                fontSize: 13,
              }}
            >
              {'\u05D0\u05D5'}
            </Text>
            <View
              style={{
                flex: 1,
                height: 0.5,
                backgroundColor: Colors.cardBorder,
              }}
            />
          </View>

          {/* Email Form */}
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

            <View style={{ gap: Spacing.sm }}>
              <GoldInput
                placeholder={'\u05E1\u05D9\u05E1\u05DE\u05D0'}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setLocalError('');
                }}
                isPassword
                autoComplete="password"
                textContentType="password"
              />

              {/* Forgot password link */}
              <Pressable
                onPress={() =>
                  router.push('/(auth)/forgot-password' as any)
                }
                hitSlop={8}
              >
                <Text
                  style={{
                    color: Colors.gold,
                    fontSize: 13,
                    fontWeight: '600',
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }}
                >
                  {'\u05E9\u05DB\u05D7\u05EA \u05D0\u05EA \u05D4\u05E1\u05D9\u05E1\u05DE\u05D0?'}
                </Text>
              </Pressable>
            </View>

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
              disabled={anyLoading}
            />

            {/* Signup section */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.md,
                paddingVertical: Spacing.sm,
              }}
            >
              <View
                style={{
                  flex: 1,
                  height: 0.5,
                  backgroundColor: Colors.cardBorder,
                }}
              />
              <Text
                style={{
                  color: Colors.textTertiary,
                  fontSize: 13,
                }}
              >
                {'\u05D0\u05D9\u05DF \u05DC\u05DA \u05D7\u05E9\u05D1\u05D5\u05DF?'}
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 0.5,
                  backgroundColor: Colors.cardBorder,
                }}
              />
            </View>

            {/* Signup link */}
            <GoldButton
              title={'\u05E6\u05D5\u05E8 \u05D7\u05E9\u05D1\u05D5\u05DF \u05D7\u05D3\u05E9'}
              variant="outline"
              onPress={() => router.push('/(auth)/signup' as any)}
              disabled={anyLoading}
            />

            {/* Info text */}
            <Text
              style={{
                color: Colors.textTertiary,
                fontSize: 12,
                textAlign: 'center',
                writingDirection: 'rtl',
                lineHeight: 18,
              }}
            >
              {'\u05D4\u05EA\u05D7\u05D1\u05E8 \u05E2\u05DD \u05D0\u05D5\u05EA\u05DD \u05E4\u05E8\u05D8\u05D9\u05DD \u05E9\u05E0\u05E8\u05E9\u05DE\u05EA \u05D1-dils.co.il'}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
