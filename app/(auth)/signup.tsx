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

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
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

  const handleSignup = async () => {
    setLocalError('');
    setSuccess('');

    if (!fullName.trim()) {
      setLocalError('\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E9\u05DD \u05DE\u05DC\u05D0');
      return;
    }

    if (!email.trim()) {
      setLocalError('\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05DB\u05EA\u05D5\u05D1\u05EA \u05D3\u05D5\u05D0\u05F4\u05DC');
      return;
    }

    if (!password || password.length < 6) {
      setLocalError('\u05D4\u05E1\u05D9\u05E1\u05DE\u05D0 \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05DB\u05D9\u05DC \u05DC\u05E4\u05D7\u05D5\u05EA 6 \u05EA\u05D5\u05D5\u05D9\u05DD');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('\u05D4\u05E1\u05D9\u05E1\u05DE\u05D0\u05D5\u05EA \u05D0\u05D9\u05E0\u05DF \u05EA\u05D5\u05D0\u05DE\u05D5\u05EA');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setLocalError('\u05DB\u05EA\u05D5\u05D1\u05EA \u05D3\u05D5\u05D0\u05F4\u05DC \u05D6\u05D5 \u05DB\u05D1\u05E8 \u05E8\u05E9\u05D5\u05DE\u05D4');
        } else {
          setLocalError(error.message);
        }
      } else {
        setSuccess('\u05E0\u05E9\u05DC\u05D7 \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D0\u05D9\u05DE\u05D5\u05EA \u2014 \u05D1\u05D3\u05D5\u05E7 \u05EA\u05D9\u05D1\u05EA \u05D4\u05D3\u05D5\u05D0\u05E8');
      }
    } catch (err: any) {
      setLocalError(err.message || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E8\u05E9\u05DE\u05D4');
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
            {'\u05D4\u05E8\u05E9\u05DE\u05D4'}
          </Text>

          {/* Form */}
          <View style={{ gap: Spacing.xl }}>
            <GoldInput
              placeholder={'\u05E9\u05DD \u05DE\u05DC\u05D0'}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setLocalError('');
                setSuccess('');
              }}
              autoCapitalize="words"
              textContentType="name"
            />

            <GoldInput
              placeholder={'\u05D3\u05D5\u05D0\u05F4\u05DC'}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setLocalError('');
                setSuccess('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <GoldInput
              placeholder={'\u05E1\u05D9\u05E1\u05DE\u05D0'}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setLocalError('');
                setSuccess('');
              }}
              isPassword
              autoComplete="new-password"
              textContentType="newPassword"
            />

            <GoldInput
              placeholder={'\u05D0\u05D9\u05DE\u05D5\u05EA \u05E1\u05D9\u05E1\u05DE\u05D0'}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setLocalError('');
                setSuccess('');
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
                  borderRadius: 12,
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
                {'\u05D9\u05E9 \u05DC\u05D9 \u05D7\u05E9\u05D1\u05D5\u05DF \u2014 \u05DB\u05E0\u05D9\u05E1\u05D4'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
