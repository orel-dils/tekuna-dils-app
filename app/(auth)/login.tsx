import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Animated,
  Easing,
  Alert,
  Pressable,
} from 'react-native';
import { useAuth } from '@fastshot/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';
import { GoldButton } from '@/components/gold-button';
import { GoldInput } from '@/components/gold-input';
import { TekunaLogo } from '@/components/tekuna-logo';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithEmail, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    clearError();
    setLocalError('');

    if (!email.trim()) {
      setLocalError('\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05DB\u05EA\u05D5\u05D1\u05EA \u05D3\u05D5\u05D0\u05F4\u05DC');
      return;
    }
    if (!password) {
      setLocalError('\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E1\u05D9\u05E1\u05DE\u05D4');
      return;
    }

    try {
      await signInWithEmail(email.trim(), password);
    } catch (err: any) {
      setLocalError(err.message || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA');
    }
  };

  const displayError = localError || error?.message;

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

            {displayError && (
              <Text
                selectable
                style={{
                  color: Colors.error,
                  fontSize: 14,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                }}
              >
                {displayError}
              </Text>
            )}

            <GoldButton
              title={'\u05D4\u05EA\u05D7\u05D1\u05E8'}
              onPress={handleLogin}
              loading={isLoading}
            />

            <Pressable
              onPress={() => {
                Alert.alert(
                  '\u05E9\u05DB\u05D7\u05EA \u05E1\u05D9\u05E1\u05DE\u05D4',
                  '\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 \u05D6\u05D5 \u05EA\u05D4\u05D9\u05D4 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05D1\u05E7\u05E8\u05D5\u05D1'
                );
              }}
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
                {'\u05E9\u05DB\u05D7\u05EA \u05E1\u05D9\u05E1\u05DE\u05D4?'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
