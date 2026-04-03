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

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');

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

  const clearErrors = () => {
    setLocalError('');
    setSuccess('');
  };

  // Normalize Israeli phone: 050-1234567 → +972501234567
  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('972')) return '+' + digits;
    if (digits.startsWith('0')) return '+972' + digits.slice(1);
    return '+972' + digits;
  };

  const handleSignup = async () => {
    setLocalError('');
    setSuccess('');

    if (!fullName.trim()) {
      setLocalError('\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E9\u05DD \u05DE\u05DC\u05D0');
      return;
    }

    if (!email.trim()) {
      setLocalError('\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setLocalError('\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4');
      return;
    }

    if (password.length < 6) {
      setLocalError('\u05E1\u05D9\u05E1\u05DE\u05D0 \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05D9\u05D5\u05EA \u05DC\u05E4\u05D7\u05D5\u05EA 6 \u05EA\u05D5\u05D5\u05D9\u05DD');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('\u05D4\u05E1\u05D9\u05E1\u05DE\u05D0\u05D5\u05EA \u05D0\u05D9\u05E0\u05DF \u05EA\u05D5\u05D0\u05DE\u05D5\u05EA');
      return;
    }

    setIsLoading(true);

    try {
      const userData: Record<string, string> = {
        full_name: fullName.trim(),
      };

      // Include phone if provided
      if (phone.trim()) {
        userData.phone = normalizePhone(phone.trim());
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: userData,
          emailRedirectTo: 'tekunapay://auth/callback',
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setLocalError(
            '\u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05DB\u05D1\u05E8 \u05E8\u05E9\u05D5\u05DD. \u05E0\u05E1\u05D4 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8.'
          );
        } else {
          setLocalError(error.message);
        }
        return;
      }

      // If session exists — email confirm is OFF → auto login
      if (data.session) {
        // Auth guard in _layout.tsx handles redirect
      } else {
        // Email confirm is ON
        setSuccess(
          '\u05E0\u05E9\u05DC\u05D7 \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D0\u05D9\u05DE\u05D5\u05EA \u05DC\u05DB\u05EA\u05D5\u05D1\u05EA ' +
            email +
            '\n\u05D1\u05D3\u05D5\u05E7 \u05EA\u05D9\u05D1\u05EA \u05D4\u05D3\u05D5\u05D0\u05E8 \u05E9\u05DC\u05DA \u05D5\u05DC\u05D7\u05E5 \u05E2\u05DC \u05D4\u05E7\u05D9\u05E9\u05D5\u05E8'
        );
      }
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

          {/* Title */}
          <View style={{ gap: Spacing.xs }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: Colors.gold,
                textAlign: 'right',
                writingDirection: 'rtl',
              }}
            >
              {'\u05D4\u05E8\u05E9\u05DE\u05D4'}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: Colors.textSecondary,
                textAlign: 'right',
                writingDirection: 'rtl',
              }}
            >
              {'\u05E6\u05D5\u05E8 \u05D7\u05E9\u05D1\u05D5\u05DF \u05D5\u05D4\u05EA\u05D7\u05DC \u05DC\u05E9\u05DC\u05DD \u05E2\u05DD DILS'}
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: Spacing.lg }}>
            <GoldInput
              label={'\u05E9\u05DD \u05DE\u05DC\u05D0'}
              placeholder={'\u05D9\u05E9\u05E8\u05D0\u05DC \u05D9\u05E9\u05E8\u05D0\u05DC\u05D9'}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                clearErrors();
              }}
              autoCapitalize="words"
              textContentType="name"
            />

            <GoldInput
              label={'\u05D8\u05DC\u05E4\u05D5\u05DF \u05E0\u05D9\u05D9\u05D3'}
              placeholder="050-123-4567"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                clearErrors();
              }}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />

            <GoldInput
              label={'\u05D3\u05D5\u05D0\u05F4\u05DC'}
              placeholder="name@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearErrors();
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <GoldInput
              label={'\u05E1\u05D9\u05E1\u05DE\u05D0'}
              placeholder={'\u05DC\u05E4\u05D7\u05D5\u05EA 6 \u05EA\u05D5\u05D5\u05D9\u05DD'}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearErrors();
              }}
              isPassword
              autoComplete="new-password"
              textContentType="newPassword"
            />

            <GoldInput
              label={'\u05D0\u05D9\u05DE\u05D5\u05EA \u05E1\u05D9\u05E1\u05DE\u05D0'}
              placeholder={'\u05D4\u05D6\u05DF \u05E9\u05D5\u05D1 \u05D0\u05EA \u05D4\u05E1\u05D9\u05E1\u05DE\u05D0'}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                clearErrors();
              }}
              isPassword
              autoComplete="new-password"
              textContentType="newPassword"
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

            {success ? (
              <View
                style={{
                  backgroundColor: 'rgba(52,199,89,0.12)',
                  borderRadius: Radius.lg,
                  borderCurve: 'continuous',
                  padding: Spacing.lg,
                }}
              >
                <Text
                  selectable
                  style={{
                    color: Colors.success,
                    fontSize: 14,
                    textAlign: 'right',
                    writingDirection: 'rtl',
                    lineHeight: 22,
                  }}
                >
                  {success}
                </Text>
              </View>
            ) : null}

            <GoldButton
              title={'\u05D4\u05D9\u05E8\u05E9\u05DD'}
              onPress={handleSignup}
              loading={isLoading}
              disabled={!!success}
            />

            {/* Terms notice */}
            <Text
              style={{
                color: Colors.textTertiary,
                fontSize: 12,
                textAlign: 'center',
                writingDirection: 'rtl',
                lineHeight: 18,
              }}
            >
              {'\u05D1\u05DC\u05D7\u05D9\u05E6\u05D4 \u05E2\u05DC "\u05D4\u05D9\u05E8\u05E9\u05DD" \u05D0\u05EA\u05D4 \u05DE\u05E1\u05DB\u05D9\u05DD\n\u05DC\u05EA\u05E0\u05D0\u05D9 \u05D4\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D5\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05E4\u05E8\u05D8\u05D9\u05D5\u05EA'}
            </Text>

            {/* Divider */}
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
              <Text style={{ color: Colors.textTertiary, fontSize: 13 }}>
                {'\u05DB\u05D1\u05E8 \u05D9\u05E9 \u05DC\u05DA \u05D7\u05E9\u05D1\u05D5\u05DF?'}
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 0.5,
                  backgroundColor: Colors.cardBorder,
                }}
              />
            </View>

            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={{
                paddingVertical: Spacing.md,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: Colors.gold,
                  fontSize: 15,
                  fontWeight: '600',
                  writingDirection: 'rtl',
                }}
              >
                {'\u05DB\u05E0\u05D9\u05E1\u05D4 \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
