import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Share,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@/hooks/use-wallet';
import { useAppStore } from '@/store/useAppStore';
import { formatBalance, formatDateTime } from '@/lib/format';
import { Transaction } from '@/hooks/use-transactions';
import { LoadingScreen } from '@/components/loading-screen';
import { ErrorState } from '@/components/error-state';
import { GoldButton } from '@/components/gold-button';

type Step = 'amount' | 'pin' | 'success';

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
const PIN_EXPIRY_SECONDS = 180;

export default function PayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wallet, loading: walletLoading, error: walletError, refetch } = useWallet();
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('0');
  const [pin, setPin] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(PIN_EXPIRY_SECONDS);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [receivedTxn, setReceivedTxn] = useState<Transaction | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pinScale = useRef(new Animated.Value(0.8)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const checkmarkRotate = useRef(new Animated.Value(0)).current;
  const successFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Countdown timer for PIN
  useEffect(() => {
    if (step !== 'pin' || !expiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.ceil((expiry - now) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setStep('amount');
        setPin('');
        setAmount('0');
        setError('\u05E7\u05D5\u05D3 \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05E4\u05D2 \u05EA\u05D5\u05E7\u05E3');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, expiresAt]);

  // Animate PIN display when entering pin step
  useEffect(() => {
    if (step === 'pin') {
      pinScale.setValue(0.8);
      Animated.spring(pinScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [step, pinScale]);

  // Animate success screen
  useEffect(() => {
    if (step === 'success') {
      successScale.setValue(0);
      checkmarkRotate.setValue(0);
      successFade.setValue(0);

      Animated.sequence([
        Animated.spring(successScale, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(checkmarkRotate, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(successFade, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [step, successScale, checkmarkRotate, successFade]);

  // Log payment event to mobile-events endpoint
  const logPaymentEvent = async (amountMinor: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const sessionId = useAppStore.getState().sessionId;

      await fetch(
        process.env.EXPO_PUBLIC_SUPABASE_URL +
          '/functions/v1/mobile-events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            events: [
              {
                event_name: 'payment_completed',
                screen_name: 'pay',
                metadata: {
                  amount: amountMinor,
                  platform: Platform.OS,
                },
              },
            ],
          }),
        }
      );
    } catch (e) {
      console.log('Payment event log error:', e);
    }
  };

  // Realtime listener for payment confirmation — filtered by wallet address
  useEffect(() => {
    if (step !== 'pin' || !wallet) return;

    const numAmount = parseFloat(amount);
    const channel = supabase
      .channel('payment-confirm')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ledger_transactions_v3',
          filter: `destination_address=eq.${wallet.address}`,
        },
        (payload) => {
          const tx = payload.new as Transaction;
          if (tx.amount >= numAmount) {
            setReceivedTxn(tx);
            setStep('success');
            refetch();

            // Log payment_completed event
            logPaymentEvent(tx.amount);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [step, wallet, amount, refetch]);

  const handleKeyPress = useCallback((key: string) => {
    setError('');
    setAmount((prev) => {
      if (key === 'del') {
        const next = prev.slice(0, -1);
        return next || '0';
      }
      if (key === '.') {
        if (prev.includes('.')) return prev;
        return prev + '.';
      }
      // Limit to 2 decimal places
      const parts = prev.split('.');
      if (parts[1] && parts[1].length >= 2) return prev;
      // Replace leading zero
      if (prev === '0' && key !== '.') return key;
      return prev + key;
    });
  }, []);

  const handleGeneratePin = async () => {
    setError('');
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      setError('\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E1\u05DB\u05D5\u05DD \u05EA\u05E7\u05D9\u05DF');
      return;
    }

    if (wallet && numAmount > Number(wallet.balance)) {
      setError('\u05D9\u05EA\u05E8\u05D4 \u05DC\u05D0 \u05DE\u05E1\u05E4\u05D9\u05E7\u05D4');
      return;
    }

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('\u05E0\u05D0 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DE\u05D7\u05D3\u05E9');
        return;
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/generate-payment-pin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ amount: numAmount }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05E7\u05D5\u05D3');
      }

      setPin(data.pin_code);
      setExpiresAt(data.expires_at);
      setSecondsLeft(PIN_EXPIRY_SECONDS);
      setStep('pin');
    } catch (err: any) {
      setError(err.message || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05E7\u05D5\u05D3 \u05EA\u05E9\u05DC\u05D5\u05DD');
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setStep('amount');
    setAmount('0');
    setPin('');
    setExpiresAt('');
    setError('');
    setReceivedTxn(null);
  };

  const handleShareReceipt = async () => {
    if (!receivedTxn) return;

    const receiptText = [
      '\u2705 \u05E7\u05D1\u05DC\u05D4 \u05DE-DILS',
      '',
      `\u05E1\u05DB\u05D5\u05DD: \u20AA${formatBalance(receivedTxn.amount)}`,
      `\u05DE\u05E1\u05E4\u05E8 \u05E2\u05E1\u05E7\u05D4: ${receivedTxn.tx_hash || receivedTxn.id}`,
      `\u05EA\u05D0\u05E8\u05D9\u05DA: ${formatDateTime(receivedTxn.created_at)}`,
      `\u05DE\u05D0\u05EA: ${receivedTxn.source_address}`,
      '',
      'DILS Payment Network',
    ].join('\n');

    try {
      await Share.share({
        message: receiptText,
      });
    } catch {
      // User cancelled share
    }
  };

  if (walletLoading && !wallet) {
    return <LoadingScreen message={'\u05D8\u05D5\u05E2\u05DF...'} />;
  }

  if (walletError) {
    return <ErrorState message={walletError} onRetry={refetch} />;
  }

  const progressFraction = secondsLeft / PIN_EXPIRY_SECONDS;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const checkmarkSpin = checkmarkRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Success screen
  if (step === 'success') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.xxxl,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.xxl,
          alignItems: 'center',
          gap: Spacing.xxl,
          flexGrow: 1,
        }}
      >
        {/* Animated green checkmark */}
        <Animated.View
          style={{
            marginTop: Spacing.xxxl,
            alignItems: 'center',
            gap: Spacing.lg,
            transform: [{ scale: successScale }],
          }}
        >
          <Animated.View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: 'rgba(52,199,89,0.12)',
              borderWidth: 3,
              borderColor: Colors.success,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 50px rgba(52,199,89,0.3)',
              transform: [{ rotate: checkmarkSpin }],
            }}
          >
            <Text style={{ fontSize: 56, lineHeight: 64 }}>{'\u2705'}</Text>
          </Animated.View>
        </Animated.View>

        {/* Title */}
        <Animated.View
          style={{
            alignItems: 'center',
            gap: Spacing.md,
            opacity: successFade,
          }}
        >
          <Text
            style={{
              fontSize: 30,
              fontWeight: '800',
              color: Colors.success,
              textAlign: 'center',
              writingDirection: 'rtl',
            }}
          >
            {'\u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05D4\u05EA\u05E7\u05D1\u05DC!'}
          </Text>

          {/* Amount */}
          <Text
            selectable
            style={{
              fontSize: 44,
              fontWeight: '900',
              color: Colors.white,
              fontVariant: ['tabular-nums'],
              letterSpacing: -1,
            }}
          >
            {'\u20AA'}{formatBalance(receivedTxn ? receivedTxn.amount : parseFloat(amount))}
          </Text>
        </Animated.View>

        {/* Transaction details card */}
        <Animated.View
          style={{
            width: '100%',
            backgroundColor: Colors.card,
            borderRadius: Radius.lg,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: Colors.cardBorder,
            padding: Spacing.xxl,
            gap: Spacing.lg,
            opacity: successFade,
          }}
        >
          {/* Transaction ID */}
          <View style={{ gap: Spacing.xs }}>
            <Text
              style={{
                fontSize: 13,
                color: Colors.textSecondary,
                textAlign: 'right',
                writingDirection: 'rtl',
              }}
            >
              {'\u05DE\u05E1\u05E4\u05E8 \u05E2\u05E1\u05E7\u05D4'}
            </Text>
            <Text
              selectable
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: Colors.white,
                textAlign: 'right',
                fontFamily: 'monospace',
              }}
              numberOfLines={1}
            >
              {receivedTxn?.tx_hash || receivedTxn?.id || '---'}
            </Text>
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: Colors.cardBorder,
            }}
          />

          {/* From address */}
          {receivedTxn?.source_address && (
            <View style={{ gap: Spacing.xs }}>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textSecondary,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                }}
              >
                {'\u05DE\u05D0\u05EA'}
              </Text>
              <Text
                selectable
                style={{
                  fontSize: 14,
                  color: Colors.textSecondary,
                  textAlign: 'right',
                  fontFamily: 'monospace',
                }}
                numberOfLines={1}
              >
                {receivedTxn.source_address}
              </Text>
            </View>
          )}

          {/* Date */}
          {receivedTxn?.created_at && (
            <>
              <View
                style={{
                  height: 1,
                  backgroundColor: Colors.cardBorder,
                }}
              />
              <View style={{ gap: Spacing.xs }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: Colors.textSecondary,
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }}
                >
                  {'\u05EA\u05D0\u05E8\u05D9\u05DA'}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: Colors.white,
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }}
                >
                  {formatDateTime(receivedTxn.created_at)}
                </Text>
              </View>
            </>
          )}
        </Animated.View>

        {/* Action buttons */}
        <Animated.View
          style={{
            width: '100%',
            gap: Spacing.md,
            marginTop: Spacing.lg,
            opacity: successFade,
          }}
        >
          <GoldButton
            title={'\u05D7\u05D6\u05D5\u05E8 \u05DC\u05D1\u05D9\u05EA'}
            onPress={() => router.replace('/(tabs)/home' as any)}
          />
          <GoldButton
            title={'\u05E9\u05DC\u05D7 \u05E7\u05D1\u05DC\u05D4'}
            icon={'\uD83D\uDCE4'}
            variant="outline"
            onPress={handleShareReceipt}
          />
        </Animated.View>
      </ScrollView>
    );
  }

  // PIN display screen
  if (step === 'pin') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.xxl,
          alignItems: 'center',
          gap: Spacing.xxl,
        }}
      >
        <Text
          style={{
            fontSize: 26,
            fontWeight: '800',
            color: Colors.gold,
            textAlign: 'center',
            writingDirection: 'rtl',
          }}
        >
          {'\u05E7\u05D5\u05D3 \u05EA\u05E9\u05DC\u05D5\u05DD'}
        </Text>

        <Text
          style={{
            fontSize: 15,
            color: Colors.textSecondary,
            textAlign: 'center',
            writingDirection: 'rtl',
            lineHeight: 22,
          }}
        >
          {'\u05D4\u05E6\u05D2 \u05DC\u05E7\u05D5\u05E4\u05D0\u05D9 \u05D0\u05EA \u05D4\u05E7\u05D5\u05D3\n\u05D4\u05E7\u05D5\u05E4\u05D0\u05D9 \u05D9\u05D6\u05D9\u05DF \u05D0\u05D5\u05EA\u05D5 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA \u05D5\u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05D9\u05EA\u05D1\u05E6\u05E2'}
        </Text>

        {/* PIN digit boxes */}
        <Animated.View
          style={{
            alignItems: 'center',
            gap: Spacing.lg,
            transform: [{ scale: pinScale }],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: Spacing.md,
            }}
          >
            {pin.split('').map((digit, i) => (
              <View
                key={i}
                style={{
                  width: 64,
                  height: 80,
                  borderRadius: Radius.lg,
                  borderCurve: 'continuous',
                  borderWidth: 3,
                  borderColor: secondsLeft > 30 ? Colors.gold : Colors.error,
                  backgroundColor: 'rgba(197,160,40,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 20px ${secondsLeft > 30 ? 'rgba(197,160,40,0.2)' : 'rgba(255,59,48,0.2)'}`,
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 36,
                    fontWeight: '900',
                    color: Colors.white,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {digit}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Timer */}
        <View style={{ alignItems: 'center', gap: Spacing.sm }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: '700',
              color: secondsLeft > 30 ? Colors.white : Colors.error,
              fontVariant: ['tabular-nums'],
            }}
          >
            {timerDisplay}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: Colors.textSecondary,
              writingDirection: 'rtl',
            }}
          >
            {'\u05D6\u05DE\u05DF \u05E0\u05D5\u05EA\u05E8 \u05DC\u05D4\u05E6\u05D2\u05EA \u05D4\u05E7\u05D5\u05D3'}
          </Text>
        </View>

        {/* Progress bar */}
        <View
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            backgroundColor: Colors.card,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${progressFraction * 100}%`,
              height: '100%',
              borderRadius: 3,
              backgroundColor: secondsLeft > 30 ? Colors.gold : Colors.error,
            }}
          />
        </View>

        {/* Amount */}
        <View
          style={{
            backgroundColor: Colors.card,
            borderRadius: Radius.lg,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: Colors.cardBorder,
            paddingVertical: Spacing.lg,
            paddingHorizontal: Spacing.xxl,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: Colors.textSecondary,
              writingDirection: 'rtl',
              marginBottom: 4,
            }}
          >
            {'\u05E1\u05DB\u05D5\u05DD \u05DC\u05EA\u05E9\u05DC\u05D5\u05DD'}
          </Text>
          <Text
            selectable
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: Colors.white,
              fontVariant: ['tabular-nums'],
            }}
          >
            {'\u20AA'}{formatBalance(parseFloat(amount))}
          </Text>
        </View>

        <GoldButton
          title={'\u05D1\u05D9\u05D8\u05D5\u05DC'}
          variant="outline"
          onPress={handleReset}
        />
      </ScrollView>
    );
  }

  // Amount entry screen
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.lg,
        paddingHorizontal: Spacing.xl,
      }}
    >
      <Animated.View style={{ flex: 1, gap: Spacing.lg, opacity: fadeAnim }}>
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
          {'\u05E9\u05DC\u05DD'}
        </Text>

        {/* Amount display */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: Colors.textSecondary,
              writingDirection: 'rtl',
              marginBottom: Spacing.sm,
            }}
          >
            {'\u05E1\u05DB\u05D5\u05DD \u05DC\u05EA\u05E9\u05DC\u05D5\u05DD'}
          </Text>
          <Text
            selectable
            style={{
              fontSize: 52,
              fontWeight: '800',
              color: Colors.white,
              fontVariant: ['tabular-nums'],
              letterSpacing: -1,
            }}
          >
            {'\u20AA'}{amount}
          </Text>
          {wallet && (
            <Text
              style={{
                fontSize: 13,
                color: Colors.textSecondary,
                marginTop: Spacing.sm,
                fontVariant: ['tabular-nums'],
              }}
            >
              {'\u05D9\u05EA\u05E8\u05D4: \u20AA'}{formatBalance(Number(wallet.balance))}
            </Text>
          )}
        </View>

        {/* Error */}
        {error ? (
          <Text
            selectable
            style={{
              color: Colors.error,
              fontSize: 14,
              textAlign: 'center',
              writingDirection: 'rtl',
            }}
          >
            {error}
          </Text>
        ) : null}

        {/* Keypad */}
        <View style={{ gap: Spacing.sm }}>
          {[0, 1, 2, 3].map((row) => (
            <View key={row} style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {KEYPAD_KEYS.slice(row * 3, row * 3 + 3).map((key) => (
                <Pressable
                  key={key}
                  onPress={() => handleKeyPress(key)}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 56,
                    borderRadius: Radius.md,
                    borderCurve: 'continuous',
                    backgroundColor: pressed
                      ? Colors.cardBorder
                      : key === 'del'
                      ? 'transparent'
                      : Colors.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: key === 'del' ? 0 : 1,
                    borderColor: Colors.cardBorder,
                  })}
                >
                  <Text
                    style={{
                      fontSize: key === 'del' ? 20 : 22,
                      fontWeight: '600',
                      color: key === 'del' ? Colors.error : Colors.white,
                    }}
                  >
                    {key === 'del' ? '\u232B' : key}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        {/* Generate PIN button */}
        <GoldButton
          title={'\u05D4\u05E4\u05E7 \u05E7\u05D5\u05D3 \u05EA\u05E9\u05DC\u05D5\u05DD'}
          onPress={handleGeneratePin}
          loading={generating}
          disabled={amount === '0' || amount === '0.'}
        />
      </Animated.View>
    </View>
  );
}
