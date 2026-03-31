import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { Transaction } from '@/hooks/use-transactions';
import { formatBalance, truncateAddress, formatDate } from '@/lib/format';

interface TransactionItemProps {
  transaction: Transaction;
  walletAddress: string;
}

export function TransactionItem({ transaction, walletAddress }: TransactionItemProps) {
  const router = useRouter();
  const isSent = transaction.from_address === walletAddress;
  const amount = transaction.amount;
  const counterparty = isSent ? transaction.to_address : transaction.from_address;
  const label = isSent
    ? '\u05E0\u05E9\u05DC\u05D7 \u05DC-' + truncateAddress(counterparty)
    : '\u05D4\u05EA\u05E7\u05D1\u05DC \u05DE-' + truncateAddress(counterparty);

  return (
    <Pressable
      onPress={() => router.push(`/transaction/${transaction.id}` as any)}
      style={({ pressed }) => ({
        backgroundColor: Colors.card,
        borderRadius: Radius.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: Spacing.lg,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: Spacing.md,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isSent
            ? 'rgba(197,160,40,0.15)'
            : 'rgba(52,199,89,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 18,
            color: isSent ? Colors.gold : Colors.success,
            fontWeight: '700',
          }}
        >
          {isSent ? '\u2191' : '\u2193'}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: Colors.white,
            fontSize: 15,
            fontWeight: '600',
            textAlign: 'right',
            writingDirection: 'rtl',
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={{
            color: Colors.textSecondary,
            fontSize: 13,
            textAlign: 'right',
            writingDirection: 'rtl',
          }}
        >
          {formatDate(transaction.created_at)}
        </Text>
      </View>

      <Text
        selectable
        style={{
          color: isSent ? Colors.white : Colors.success,
          fontSize: 16,
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
        }}
      >
        {isSent ? '-' : '+'}
        {'\u20AA'}
        {formatBalance(amount)}
      </Text>
    </Pressable>
  );
}
