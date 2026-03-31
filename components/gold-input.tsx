import { useState } from 'react';
import { View, TextInput, Text, Pressable, TextInputProps } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface GoldInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export function GoldInput({
  label,
  error,
  isPassword,
  ...props
}: GoldInputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={{ gap: Spacing.sm }}>
      {label && (
        <Text
          style={{
            color: Colors.gold,
            fontSize: 14,
            fontWeight: '600',
            textAlign: 'right',
            writingDirection: 'rtl',
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          backgroundColor: Colors.inputBg,
          borderRadius: Radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1.5,
          borderColor: error
            ? Colors.error
            : focused
            ? Colors.gold
            : Colors.cardBorder,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <TextInput
          {...props}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={Colors.textTertiary}
          style={{
            flex: 1,
            color: Colors.white,
            fontSize: 16,
            paddingVertical: Spacing.lg,
            textAlign: 'right',
            writingDirection: 'rtl',
            minHeight: 52,
          }}
        />
        {isPassword && (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={12}
            style={{ paddingLeft: Spacing.sm }}
          >
            <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
              {showPassword ? 'הסתר' : 'הצג'}
            </Text>
          </Pressable>
        )}
      </View>
      {error && (
        <Text
          style={{
            color: Colors.error,
            fontSize: 13,
            textAlign: 'right',
            writingDirection: 'rtl',
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
