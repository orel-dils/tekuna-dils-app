import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Animated, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useTransactions, FilterType } from '@/hooks/use-transactions';
import { formatBalance } from '@/lib/format';
import { TransactionItem } from '@/components/transaction-item';
import { LoadingScreen } from '@/components/loading-screen';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '\u05D4\u05DB\u05DC' },
  { key: 'sent', label: '\u05E0\u05E9\u05DC\u05D7' },
  { key: 'received', label: '\u05D4\u05EA\u05E7\u05D1\u05DC' },
];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { wallet, loading: walletLoading } = useWallet();
  const {
    transactions,
    loading: txLoading,
    filter,
    setFilter,
    refetch,
  } = useTransactions(wallet?.address);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (walletLoading && !wallet) {
    return <LoadingScreen />;
  }

  // Calculate totals
  const totalReceived = transactions
    .filter((tx) => tx.to_address === wallet?.address)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalSent = transactions
    .filter((tx) => tx.from_address === wallet?.address)
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: Spacing.xl,
        gap: Spacing.xxl,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.gold}
        />
      }
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
          {'\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4'}
        </Text>

        {/* Filter Tabs */}
        <View
          style={{
            flexDirection: 'row-reverse',
            gap: Spacing.sm,
          }}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                paddingVertical: Spacing.sm,
                paddingHorizontal: Spacing.lg,
                borderRadius: Radius.full,
                borderCurve: 'continuous',
                backgroundColor:
                  filter === f.key ? Colors.gold : 'transparent',
                borderWidth: filter === f.key ? 0 : 1,
                borderColor: Colors.cardBorder,
              }}
            >
              <Text
                style={{
                  color:
                    filter === f.key ? Colors.background : Colors.textSecondary,
                  fontSize: 14,
                  fontWeight: '600',
                  writingDirection: 'rtl',
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Transaction List */}
        {txLoading && !transactions.length ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
              {'\u05D8\u05D5\u05E2\u05DF...'}
            </Text>
          </View>
        ) : transactions.length === 0 ? (
          <View
            style={{
              paddingVertical: 60,
              alignItems: 'center',
              gap: Spacing.sm,
            }}
          >
            <Text style={{ fontSize: 32, opacity: 0.3 }}>{'\uD83D\uDCCB'}</Text>
            <Text
              style={{
                color: Colors.textSecondary,
                fontSize: 15,
                textAlign: 'center',
                writingDirection: 'rtl',
              }}
            >
              {'\u05D0\u05D9\u05DF \u05D8\u05E8\u05E0\u05D6\u05E7\u05E6\u05D9\u05D5\u05EA'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {transactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                walletAddress={wallet?.address ?? ''}
              />
            ))}
          </View>
        )}

        {/* Totals Summary */}
        {transactions.length > 0 && (
          <View
            style={{
              flexDirection: 'row-reverse',
              justifyContent: 'space-around',
              paddingVertical: Spacing.lg,
              borderTopWidth: 1,
              borderTopColor: Colors.cardBorder,
            }}
          >
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text
                style={{
                  color: Colors.success,
                  fontSize: 18,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                }}
              >
                +{'\u20AA'}{formatBalance(totalReceived)}
              </Text>
              <Text
                style={{
                  color: Colors.textSecondary,
                  fontSize: 12,
                  writingDirection: 'rtl',
                }}
              >
                {'\u05D4\u05EA\u05E7\u05D1\u05DC'}
              </Text>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text
                style={{
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                }}
              >
                -{'\u20AA'}{formatBalance(totalSent)}
              </Text>
              <Text
                style={{
                  color: Colors.textSecondary,
                  fontSize: 12,
                  writingDirection: 'rtl',
                }}
              >
                {'\u05E0\u05E9\u05DC\u05D7'}
              </Text>
            </View>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}
