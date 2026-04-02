import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@/hooks/use-wallet';
import { formatBalance } from '@/lib/format';
import { LoadingScreen } from '@/components/loading-screen';
import { ErrorState } from '@/components/error-state';
import { GoldButton } from '@/components/gold-button';

type Step = 'amount' | 'pin' | 'success';

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
const PIN_EXPIRY_SECONDS = 180;

export default function PayScreen() {
  const insets = useSafeAreaInsets();
  const { wallet, loading: walletLoading, error: walletError, refetch } = useWallet();
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('0');
  const [pin, setPin] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(PIN_EXPIRY_SECONDS);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pinScale = useRef(new Animated.Value(0.8)).current;
  const successScale = useRef(new Animated.Value(0)).current;

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

  // Realtime listener for payment confirmation
  useEffect(() => {
    if (step !== 'pin' || !wallet) return;

    const channel = supabase
      .channel('pay-confirmation')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          const tx = payload.new as any;
          if (tx.to_address === wallet.address) {
            setStep('success');
            successScale.setValue(0);
            Animated.spring(successScale, {
              toValue: 1,
              tension: 40,
              friction: 6,
              useNativeDriver: true,
            }).start();
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [step, wallet, successScale, refetch]);

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

  // Success screen
  if (step === 'success') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: Spacing.xxl,
          gap: Spacing.xxl,
        }}
      >
        <Animated.View
          style={{
            alignItems: 'center',
            gap: Spacing.xxl,
            transform: [{ scale: successScale }],
          }}
        >
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: 'rgba(52,199,89,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 48 }}>{'\u2705'}</Text>
          </View>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: Colors.success,
              textAlign: 'center',
              writingDirection: 'rtl',
            }}
          >
            {'\u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05D4\u05EA\u05E7\u05D1\u05DC!'}
          </Text>
          <Text
            style={{
              fontSize: 36,
              fontWeight: '800',
              color: Colors.white,
              fontVariant: ['tabular-nums'],
            }}
          >
            {'\u20AA'}{formatBalance(parseFloat(amount))}
          </Text>
        </Animated.View>
        <GoldButton
          title={'\u05EA\u05E9\u05DC\u05D5\u05DD \u05D7\u05D3\u05E9'}
          onPress={handleReset}
          style={{ marginTop: Spacing.xxl }}
        />
      </View>
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
          {'\u05D4\u05E6\u05D2 \u05DC\u05E7\u05D5\u05E4\u05D0\u05D9 \u05D0\u05EA \u05D4\u05E7\u05D5\u05D3 \u05DC\u05D4\u05E9\u05DC\u05DE\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD'}
        </Text>

        {/* Countdown circle */}
        <Animated.View
          style={{
            width: 200,
            height: 200,
            borderRadius: 100,
            borderWidth: 6,
            borderColor: secondsLeft > 30 ? Colors.gold : Colors.error,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pinScale }],
            boxShadow: `0 0 40px ${secondsLeft > 30 ? 'rgba(197,160,40,0.3)' : 'rgba(255,59,48,0.3)'}`,
          }}
        >
          <Text
            selectable
            style={{
              fontSize: 52,
              fontWeight: '900',
              color: Colors.white,
              fontVariant: ['tabular-nums'],
              letterSpacing: 8,
            }}
          >
            {pin}
          </Text>
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
