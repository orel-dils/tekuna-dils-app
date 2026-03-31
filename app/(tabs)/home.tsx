import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Animated, Easing, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@fastshot/auth';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useTransactions } from '@/hooks/use-transactions';
import { formatBalance, truncateAddress } from '@/lib/format';
import { TransactionItem } from '@/components/transaction-item';
import { LoadingScreen } from '@/components/loading-screen';
import { ErrorState } from '@/components/error-state';
import { GoldButton } from '@/components/gold-button';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { wallet, loading: walletLoading, error: walletError, refetch: refetchWallet } = useWallet();
  const { transactions, loading: txLoading, refetch: refetchTx } = useTransactions(wallet?.address);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.05)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, cardSlide]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchWallet(), refetchTx()]);
    setRefreshing(false);
  };

  if (walletLoading && !wallet) {
    return <LoadingScreen message={'\u05D8\u05D5\u05E2\u05DF \u05D0\u05E8\u05E0\u05E7...'} />;
  }

  if (walletError) {
    return <ErrorState message={walletError} onRetry={refetchWallet} />;
  }

  const displayName = user?.email?.split('@')[0] || '\u05DE\u05E9\u05EA\u05DE\u05E9';
  const recentTransactions = transactions.slice(0, 5);

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
      {/* Header */}
      <Animated.View
        style={{
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: fadeAnim,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: Colors.white,
            writingDirection: 'rtl',
          }}
        >
          {'\u05E9\u05DC\u05D5\u05DD, '}{displayName}
        </Text>
        <Pressable
          onPress={signOut}
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
          <Text style={{ fontSize: 16 }}>{'\u2699\uFE0F'}</Text>
        </Pressable>
      </Animated.View>

      {/* Balance Card */}
      <Animated.View
        style={{
          backgroundColor: Colors.card,
          borderRadius: Radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1.5,
          borderColor: Colors.cardBorder,
          padding: Spacing.xxl,
          gap: Spacing.md,
          opacity: fadeAnim,
          transform: [{ translateY: cardSlide }],
          boxShadow: '0 0 30px rgba(197,160,40,0.15)',
        }}
      >
        <Text
          style={{
            color: Colors.gold,
            fontSize: 14,
            fontWeight: '600',
            textAlign: 'right',
            writingDirection: 'rtl',
          }}
        >
          {'\u05D9\u05EA\u05E8\u05EA DILS'}
        </Text>
        <Text
          selectable
          style={{
            color: Colors.white,
            fontSize: 44,
            fontWeight: '800',
            textAlign: 'right',
            fontVariant: ['tabular-nums'],
            letterSpacing: -1,
          }}
        >
          {'\u20AA'}{formatBalance(wallet?.balance ?? 0)}
        </Text>
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: Spacing.xs,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: Colors.success,
            }}
          />
          <Text
            selectable
            style={{
              color: Colors.textSecondary,
              fontSize: 13,
              fontFamily: 'monospace',
            }}
          >
            {wallet ? truncateAddress(wallet.address) : '---'}
          </Text>
        </View>
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View
        style={{
          flexDirection: 'row-reverse',
          gap: Spacing.md,
          opacity: fadeAnim,
        }}
      >
        <View style={{ flex: 1 }}>
          <GoldButton
            title={'\u05E9\u05DC\u05D7'}
            icon={'\u2191'}
            onPress={() => router.push('/(tabs)/send' as any)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <GoldButton
            title={'\u05E7\u05D1\u05DC'}
            icon={'\u2193'}
            variant="outline"
            onPress={() => router.push('/(tabs)/receive' as any)}
          />
        </View>
      </Animated.View>

      {/* Recent Activity */}
      <View style={{ gap: Spacing.lg }}>
        <Text
          style={{
            color: Colors.gold,
            fontSize: 18,
            fontWeight: '700',
            textAlign: 'right',
            writingDirection: 'rtl',
          }}
        >
          {'\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05D0\u05D7\u05E8\u05D5\u05E0\u05D4'}
        </Text>

        {txLoading && !transactions.length ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
              {'\u05D8\u05D5\u05E2\u05DF...'}
            </Text>
          </View>
        ) : recentTransactions.length === 0 ? (
          <View
            style={{
              paddingVertical: 48,
              alignItems: 'center',
              gap: Spacing.sm,
            }}
          >
            <Text style={{ fontSize: 32, opacity: 0.3 }}>{'\uD83D\uDCB0'}</Text>
            <Text
              style={{
                color: Colors.textSecondary,
                fontSize: 15,
                textAlign: 'center',
                writingDirection: 'rtl',
              }}
            >
              {'\u05D0\u05D9\u05DF \u05D8\u05E8\u05E0\u05D6\u05E7\u05E6\u05D9\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {recentTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                walletAddress={wallet?.address ?? ''}
              />
            ))}
            {transactions.length > 5 && (
              <Pressable
                onPress={() => router.push('/(tabs)/history' as any)}
                style={{ paddingVertical: Spacing.md, alignItems: 'center' }}
              >
                <Text
                  style={{
                    color: Colors.gold,
                    fontSize: 14,
                    fontWeight: '600',
                    writingDirection: 'rtl',
                  }}
                >
                  {'\u05D4\u05E6\u05D2 \u05D4\u05DB\u05DC \u2190'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
