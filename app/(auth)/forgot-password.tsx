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
import { Colors, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { GoldButton } from '@/components/gold-button';
import { GoldInput } from '@/components/gold-input';
import { TekunaLogo } from '@/components/tekuna-logo';

type Step = 'email' | 'sent';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
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

  const handleReset = async () => {
    setLocalError('');

    if (!email.trim()) {
      setLocalError('\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC');
      return;
    }

    // Basic email validation
    if (!email.includes('@') || !email.includes('.')) {
      setLocalError('\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: 'tekunapay://auth/callback?type=recovery',
        }
      );

      if (error) {
        setLocalError(error.message);
        return;
      }

      setStep('sent');
    } catch {
      setLocalError('\u05E9\u05D2\u05D9\u05D0\u05EA \u05D7\u05D9\u05D1\u05D5\u05E8 \u2014 \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1');
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
            <TekunaLogo width={200} />
          </View>

          {step === 'email' ? (
            <View style={{ gap: Spacing.xl }}>
              {/* Title */}
              <View style={{ gap: Spacing.sm }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '700',
                    color: Colors.gold,
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }}
                >
                  {'\u05E9\u05D7\u05D6\u05D5\u05E8 \u05E1\u05D9\u05E1\u05DE\u05D0'}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: Colors.textSecondary,
                    textAlign: 'right',
                    writingDirection: 'rtl',
                    lineHeight: 22,
                  }}
                >
                  {'\u05D4\u05D6\u05DF \u05D0\u05EA \u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05E9\u05DC\u05DA \u05D5\u05E0\u05E9\u05DC\u05D7 \u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0\u05D9\u05E4\u05D5\u05E1 \u05E1\u05D9\u05E1\u05DE\u05D0'}
                </Text>
              </View>

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
                title={'\u05E9\u05DC\u05D7 \u05E7\u05D9\u05E9\u05D5\u05E8 \u05D0\u05D9\u05E4\u05D5\u05E1'}
                onPress={handleReset}
                loading={isLoading}
              />

              <Pressable
                onPress={() => router.back()}
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
                  {'\u2190 \u05D7\u05D6\u05E8\u05D4 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA'}
                </Text>
              </Pressable>
            </View>
          ) : (
            /* Success state — email sent */
            <View style={{ gap: Spacing.xxl, alignItems: 'center' }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: 'rgba(52,199,89,0.12)',
                  borderWidth: 2,
                  borderColor: Colors.success,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 36 }}>{'\u2709\uFE0F'}</Text>
              </View>

              <View style={{ gap: Spacing.sm }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '700',
                    color: Colors.success,
                    textAlign: 'center',
                    writingDirection: 'rtl',
                  }}
                >
                  {'\u05E0\u05E9\u05DC\u05D7 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4!'}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: Colors.textSecondary,
                    textAlign: 'center',
                    writingDirection: 'rtl',
                    lineHeight: 24,
                  }}
                >
                  {'\u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0\u05D9\u05E4\u05D5\u05E1 \u05E1\u05D9\u05E1\u05DE\u05D0 \u05E0\u05E9\u05DC\u05D7\n\u05DC\u05DB\u05EA\u05D5\u05D1\u05EA '}
                  <Text style={{ color: Colors.gold, fontWeight: '600' }}>
                    {email}
                  </Text>
                </Text>

                <View
                  style={{
                    backgroundColor: Colors.card,
                    borderRadius: Radius.lg,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: Colors.cardBorder,
                    padding: Spacing.lg,
                    marginTop: Spacing.md,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: Colors.textSecondary,
                      textAlign: 'right',
                      writingDirection: 'rtl',
                      lineHeight: 20,
                    }}
                  >
                    {'\u05D1\u05D3\u05D5\u05E7 \u05D2\u05DD \u05D0\u05EA \u05EA\u05D9\u05E7\u05D9\u05D9\u05EA \u05D4\u05E1\u05E4\u05D0\u05DD (Spam) \u05E9\u05DC\u05DA'}
                  </Text>
                </View>
              </View>

              <GoldButton
                title={'\u05D7\u05D6\u05E8\u05D4 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA'}
                onPress={() => router.replace('/(auth)/login' as any)}
              />

              <Pressable
                onPress={() => {
                  setStep('email');
                  setLocalError('');
                }}
                hitSlop={12}
              >
                <Text
                  style={{
                    color: Colors.gold,
                    fontSize: 14,
                    fontWeight: '600',
                    textAlign: 'center',
                    writingDirection: 'rtl',
                    textDecorationLine: 'underline',
                  }}
                >
                  {'\u05E9\u05DC\u05D7 \u05E9\u05D5\u05D1'}
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
