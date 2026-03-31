import { Pressable, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface GoldButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function GoldButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = true,
}: GoldButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          backgroundColor: isPrimary ? Colors.gold : 'transparent',
          borderWidth: isPrimary ? 0 : 1.5,
          borderColor: Colors.gold,
          borderRadius: Radius.lg,
          borderCurve: 'continuous',
          paddingVertical: Spacing.lg,
          paddingHorizontal: Spacing.xxl,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row-reverse',
          gap: Spacing.sm,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
          minHeight: 52,
          ...(fullWidth ? { width: '100%' as any } : {}),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? Colors.background : Colors.gold}
          size="small"
        />
      ) : (
        <>
          {icon && (
            <Text
              style={{
                fontSize: 18,
                color: isPrimary ? Colors.background : Colors.white,
              }}
            >
              {icon}
            </Text>
          )}
          <Text
            style={[
              {
                fontSize: 17,
                fontWeight: '700',
                color: isPrimary ? Colors.background : Colors.white,
                writingDirection: 'rtl',
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
