import { View, Text } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { GoldButton } from './gold-button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xxl,
        gap: Spacing.lg,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: 'rgba(255,59,48,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 24 }}>!</Text>
      </View>
      <Text
        selectable
        style={{
          color: Colors.white,
          fontSize: 16,
          textAlign: 'center',
          writingDirection: 'rtl',
          lineHeight: 24,
        }}
      >
        {message}
      </Text>
      {onRetry && (
        <GoldButton
          title={'\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1'}
          onPress={onRetry}
          fullWidth={false}
          style={{ paddingHorizontal: 32 }}
        />
      )}
    </View>
  );
}
