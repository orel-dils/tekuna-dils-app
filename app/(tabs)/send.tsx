import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/lib/supabase';
import { formatBalance } from '@/lib/format';
import { GoldButton } from '@/components/gold-button';
import { GoldInput } from '@/components/gold-input';
import { LoadingScreen } from '@/components/loading-screen';

export default function SendScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wallet, loading: walletLoading, refetch } = useWallet();
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (walletLoading) {
    return <LoadingScreen />;
  }

  const handleSendAll = () => {
    if (wallet) {
      setAmount(wallet.balance.toString());
    }
  };

  const handleSend = async () => {
    setError('');

    if (!toAddress.trim()) {
      setError('\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05E8\u05E0\u05E7 \u05D9\u05E2\u05D3');
      return;
    }

    if (!toAddress.trim().startsWith('0x')) {
      setError('\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05E8\u05E0\u05E7 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E1\u05DB\u05D5\u05DD \u05EA\u05E7\u05D9\u05DF');
      return;
    }

    if (wallet && numAmount > wallet.balance) {
      setError('\u05D9\u05EA\u05E8\u05D4 \u05DC\u05D0 \u05DE\u05E1\u05E4\u05D9\u05E7\u05D4');
      return;
    }

    if (wallet && toAddress.trim() === wallet.address) {
      setError('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05DC\u05D5\u05D7 \u05DC\u05E2\u05E6\u05DE\u05DA');
      return;
    }

    try {
      setSending(true);
      const { error: rpcError } = await supabase.rpc('process_transaction', {
        p_from_address: wallet!.address,
        p_to_address: toAddress.trim(),
        p_amount: numAmount,
      });

      if (rpcError) throw rpcError;

      await refetch();

      Alert.alert(
        '\u05D4\u05E2\u05D1\u05E8\u05D4 \u05D4\u05D5\u05E9\u05DC\u05DE\u05D4',
        `${numAmount} DILS \u05E0\u05E9\u05DC\u05D7\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`,
        [
          {
            text: '\u05D0\u05D9\u05E9\u05D5\u05E8',
            onPress: () => {
              setToAddress('');
              setAmount('');
              router.push('/(tabs)/home' as any);
            },
          },
        ]
      );
    } catch (err: any) {
      setError(err.message || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DC\u05D9\u05D7\u05D4');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.xl,
          gap: Spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ gap: Spacing.xxl, opacity: fadeAnim }}>
          {/* Title */}
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: Colors.gold,
              textAlign: 'right',
              writingDirection: 'rtl',
            }}
          >
            {'\u05E9\u05DC\u05D7 DILS'}
          </Text>

          {/* Address Input */}
          <GoldInput
            label={'\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05E8\u05E0\u05E7 \u05D9\u05E2\u05D3'}
            placeholder="0x..."
            value={toAddress}
            onChangeText={(text) => {
              setToAddress(text);
              setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* QR Scan Button */}
          <Pressable
            onPress={() => {
              Alert.alert(
                '\u05E1\u05E8\u05D9\u05E7\u05EA QR',
                '\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 \u05D6\u05D5 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05D1\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05D4\u05DE\u05D5\u05D1\u05D9\u05D9\u05DC'
              );
            }}
            style={({ pressed }) => ({
              backgroundColor: Colors.card,
              borderRadius: Radius.lg,
              borderCurve: 'continuous',
              borderWidth: 1.5,
              borderColor: Colors.cardBorder,
              paddingVertical: Spacing.lg,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row-reverse',
              gap: Spacing.sm,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 18 }}>{'\uD83D\uDCF7'}</Text>
            <Text
              style={{
                color: Colors.white,
                fontSize: 16,
                fontWeight: '600',
                writingDirection: 'rtl',
              }}
            >
              {'\u05E1\u05E8\u05D5\u05E7 QR'}
            </Text>
          </Pressable>

          {/* Amount Input */}
          <View style={{ gap: Spacing.sm }}>
            <GoldInput
              label={'\u05E1\u05DB\u05D5\u05DD DILS'}
              placeholder={'\u20AA0.00'}
              value={amount}
              onChangeText={(text) => {
                // Allow only valid numeric input
                const cleaned = text.replace(/[^0-9.]/g, '');
                setAmount(cleaned);
                setError('');
              }}
              keyboardType="decimal-pad"
            />
            <Pressable onPress={handleSendAll} hitSlop={8}>
              <Text
                style={{
                  color: Colors.gold,
                  fontSize: 14,
                  fontWeight: '600',
                  textAlign: 'right',
                  writingDirection: 'rtl',
                  textDecorationLine: 'underline',
                }}
              >
                {'\u05E9\u05DC\u05D7 \u05D4\u05DB\u05DC'}
              </Text>
            </Pressable>
          </View>

          {/* Balance info */}
          {wallet && (
            <View
              style={{
                flexDirection: 'row-reverse',
                justifyContent: 'space-between',
                paddingHorizontal: Spacing.xs,
              }}
            >
              <Text
                style={{
                  color: Colors.textSecondary,
                  fontSize: 13,
                  writingDirection: 'rtl',
                }}
              >
                {'\u05D9\u05EA\u05E8\u05D4 \u05D6\u05DE\u05D9\u05E0\u05D4:'}
              </Text>
              <Text
                style={{
                  color: Colors.textSecondary,
                  fontSize: 13,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {'\u20AA'}{formatBalance(wallet.balance)}
              </Text>
            </View>
          )}

          {/* Error */}
          {error ? (
            <Text
              selectable
              style={{
                color: Colors.error,
                fontSize: 14,
                textAlign: 'right',
                writingDirection: 'rtl',
              }}
            >
              {error}
            </Text>
          ) : null}

          {/* Submit */}
          <GoldButton
            title={'\u05D4\u05DE\u05E9\u05DA'}
            onPress={handleSend}
            loading={sending}
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
