import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Animated, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@/hooks/use-wallet';
import { Transaction } from '@/hooks/use-transactions';
import { formatBalance, formatDateTime } from '@/lib/format';
import { LoadingScreen } from '@/components/loading-screen';
import { ErrorState } from '@/components/error-state';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: Spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        gap: Spacing.md,
      }}
    >
      <Text
        style={{
          color: Colors.gold,
          fontSize: 14,
          fontWeight: '600',
          writingDirection: 'rtl',
          flexShrink: 0,
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: Colors.white,
          fontSize: 14,
          fontFamily: label.includes('Hash') || label.includes('\u05DB\u05EA\u05D5\u05D1\u05EA') ? 'monospace' : undefined,
          textAlign: 'left',
          flex: 1,
          flexWrap: 'wrap',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wallet } = useWallet();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('ledger_transactions_v3')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setTransaction(data);
    } catch (err: any) {
      setError(err.message || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05D8\u05E8\u05E0\u05D6\u05E7\u05E6\u05D9\u05D4');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (transaction) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [transaction, fadeAnim]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !transaction) {
    return (
      <ErrorState
        message={error || '\u05D8\u05E8\u05E0\u05D6\u05E7\u05E6\u05D9\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4'}
        onRetry={fetchTransaction}
      />
    );
  }

  const isSent = transaction.source_address === wallet?.address;
  const isCompleted = transaction.status === 'completed';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: Spacing.xl,
        gap: Spacing.xxl,
      }}
    >
      <Animated.View style={{ gap: Spacing.xxl, opacity: fadeAnim }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: Spacing.md,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.card,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: Colors.white, fontSize: 18, fontWeight: '600' }}>
              {'\u2190'}
            </Text>
          </Pressable>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: Colors.white,
              flex: 1,
              textAlign: 'right',
              writingDirection: 'rtl',
            }}
          >
            {'\u05E4\u05E8\u05D8\u05D9 \u05D8\u05E8\u05E0\u05D6\u05E7\u05E6\u05D9\u05D4'}
          </Text>
        </View>

        {/* Status Badge */}
        <View style={{ alignItems: 'center', gap: Spacing.lg }}>
          <View
            style={{
              paddingVertical: Spacing.sm,
              paddingHorizontal: Spacing.xl,
              borderRadius: Radius.full,
              backgroundColor: isCompleted
                ? 'rgba(52,199,89,0.15)'
                : 'rgba(255,149,0,0.15)',
            }}
          >
            <Text
              style={{
                color: isCompleted ? Colors.success : Colors.pending,
                fontSize: 14,
                fontWeight: '700',
                writingDirection: 'rtl',
              }}
            >
              {isCompleted ? '\u05D4\u05D5\u05E9\u05DC\u05DD' : '\u05DE\u05DE\u05EA\u05D9\u05DF'}
            </Text>
          </View>

          {/* Amount */}
          <Text
            selectable
            style={{
              color: Colors.white,
              fontSize: 40,
              fontWeight: '800',
              fontVariant: ['tabular-nums'],
              letterSpacing: -1,
            }}
          >
            {isSent ? '-' : '+'}
            {'\u20AA'}
            {formatBalance(transaction.amount)}
          </Text>

          <Text
            style={{
              color: Colors.textSecondary,
              fontSize: 14,
              writingDirection: 'rtl',
            }}
          >
            {isSent ? '\u05E0\u05E9\u05DC\u05D7' : '\u05D4\u05EA\u05E7\u05D1\u05DC'}
          </Text>
        </View>

        {/* Details Card */}
        <View
          style={{
            backgroundColor: Colors.card,
            borderRadius: Radius.lg,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: Colors.cardBorder,
            padding: Spacing.xl,
          }}
        >
          <DetailRow
            label={'\u05EA\u05D0\u05E8\u05D9\u05DA'}
            value={formatDateTime(transaction.created_at)}
          />
          <DetailRow
            label={'\u05DB\u05EA\u05D5\u05D1\u05EA \u05E9\u05D5\u05DC\u05D7'}
            value={transaction.source_address}
          />
          <DetailRow
            label={'\u05DB\u05EA\u05D5\u05D1\u05EA \u05E0\u05DE\u05E2\u05DF'}
            value={transaction.destination_address}
          />
          <DetailRow label="TX Hash" value={transaction.tx_hash} />
        </View>
      </Animated.View>
    </ScrollView>
  );
}
