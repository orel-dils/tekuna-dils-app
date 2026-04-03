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
  TouchableOpacity,
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

  const getErrorMessage = (errorMsg: string): string => {
    if (errorMsg.includes('Invalid API') || errorMsg.includes('api key') || errorMsg.includes('apikey')) {
      return 'שגיאת חיבור — נסה שוב';
    }
    if (errorMsg.includes('Invalid login') || errorMsg.includes('invalid_credentials')) {
      return 'אימייל או סיסמא שגויים';
    }
    if (errorMsg.includes('Email not confirmed')) {
      return 'נא לאמת את האימייל תחילה';
    }
    if (errorMsg.includes('Too many requests')) {
      return 'יותר מדי ניסיונות — המתן דקה';
    }
    if (errorMsg.includes('Network') || errorMsg.includes('fetch')) {
      return 'בעיית חיבור לאינטרנט';
    }
    return 'אירעה שגיאה — נסה שוב';
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
      setLocalError('נא למלא אימייל וסיסמא');
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
      // Success → _layout.tsx onAuthStateChange handles redirect
    } catch {
      setLocalError('שגיאת חיבור — נסה שוב');
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
            />

            {/* Divider */}
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

            {/* Signup link */}
            <GoldButton
              title={'\u05E6\u05D5\u05E8 \u05D7\u05E9\u05D1\u05D5\u05DF \u05D7\u05D3\u05E9'}
              variant="outline"
              onPress={() => router.push('/(auth)/signup' as any)}
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

            {__DEV__ && (
              <TouchableOpacity
                onPress={async () => {
                  const testEmail = 'test@tekunapay.co.il';
                  const testPass = 'Test1234!';
                  await supabase.auth.signUp({
                    email: testEmail,
                    password: testPass,
                    options: {
                      data: { full_name: '\u05DE\u05E9\u05EA\u05DE\u05E9 \u05D1\u05D3\u05D9\u05E7\u05D4' },
                    },
                  });
                  const { error } = await supabase.auth.signInWithPassword({
                    email: testEmail,
                    password: testPass,
                  });
                  if (error) setLocalError(error.message);
                }}
                style={{ marginTop: 4, padding: 8 }}
              >
                <Text
                  style={{
                    color: '#666',
                    textAlign: 'center',
                    fontSize: 12,
                  }}
                >
                  {'\uD83E\uDDEA \u05DB\u05E0\u05D9\u05E1\u05EA \u05D1\u05D3\u05D9\u05E7\u05D4 (DEV)'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
