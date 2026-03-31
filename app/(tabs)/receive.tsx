import { useRef, useEffect } from 'react';
import { View, Text, ScrollView, Animated, Alert, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { LoadingScreen } from '@/components/loading-screen';
import { ErrorState } from '@/components/error-state';
import { GoldButton } from '@/components/gold-button';
import { QRCodeDisplay } from '@/components/qr-code-display';

export default function ReceiveScreen() {
  const insets = useSafeAreaInsets();
  const { wallet, loading, error, refetch } = useWallet();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !wallet) {
    return (
      <ErrorState
        message={error || '\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05D0\u05E8\u05E0\u05E7'}
        onRetry={refetch}
      />
    );
  }

  const handleCopy = async () => {
    await Clipboard.setStringAsync(wallet.address);
    Alert.alert('\u05D4\u05D5\u05E2\u05EA\u05E7', '\u05DB\u05EA\u05D5\u05D1\u05EA \u05D4\u05D0\u05E8\u05E0\u05E7 \u05D4\u05D5\u05E2\u05EA\u05E7\u05D4');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `\u05DB\u05EA\u05D5\u05D1\u05EA \u05D4\u05D0\u05E8\u05E0\u05E7 \u05E9\u05DC\u05D9 \u05D1-DILS: ${wallet.address}`,
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.xxxl,
      }}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          gap: Spacing.xxxl,
          width: '100%',
          opacity: fadeAnim,
        }}
      >
        {/* Title */}
        <Text
          style={{
            fontSize: 26,
            fontWeight: '800',
            color: Colors.gold,
            textAlign: 'center',
            writingDirection: 'rtl',
          }}
        >
          {'\u05E7\u05D1\u05DC DILS'}
        </Text>

        {/* QR Code */}
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            backgroundColor: Colors.card,
            borderRadius: Radius.lg,
            borderCurve: 'continuous',
            borderWidth: 2,
            borderColor: Colors.gold,
            padding: Spacing.xxl,
            alignItems: 'center',
            boxShadow: '0 0 40px rgba(197,160,40,0.2)',
          }}
        >
          <QRCodeDisplay value={wallet.address} size={220} />
        </Animated.View>

        {/* Address Section */}
        <View style={{ alignItems: 'center', gap: Spacing.sm }}>
          <Text
            style={{
              color: Colors.gold,
              fontSize: 14,
              fontWeight: '600',
              writingDirection: 'rtl',
            }}
          >
            {'\u05DB\u05EA\u05D5\u05D1\u05EA \u05D4\u05D0\u05E8\u05E0\u05E7 \u05E9\u05DC\u05DA'}
          </Text>
          <Text
            selectable
            style={{
              color: Colors.white,
              fontSize: 15,
              fontFamily: 'monospace',
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            {wallet.address}
          </Text>
        </View>

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: 'row-reverse',
            gap: Spacing.md,
            width: '100%',
          }}
        >
          <View style={{ flex: 1 }}>
            <GoldButton title={'\u05D4\u05E2\u05EA\u05E7'} onPress={handleCopy} />
          </View>
          <View style={{ flex: 1 }}>
            <GoldButton
              title={'\u05E9\u05EA\u05E3'}
              variant="outline"
              onPress={handleShare}
            />
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}
