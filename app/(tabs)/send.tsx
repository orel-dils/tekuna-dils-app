import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  Animated,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { formatBalance } from '@/lib/format';
import { useAuth } from '@fastshot/auth';
import { supabase } from '@/lib/supabase';
import { useContacts } from '@/hooks/use-contacts';
import { GoldButton } from '@/components/gold-button';
import { GoldInput } from '@/components/gold-input';
import { LoadingScreen } from '@/components/loading-screen';

type SendMode = 'pin' | 'address';

interface ContactResult {
  display_name: string;
  phone_number: string;
}

export default function SendScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wallet, loading: walletLoading, refetch } = useWallet();
  const { session } = useAuth();
  const { loadContacts } = useContacts();

  // Mode selection
  const [mode, setMode] = useState<SendMode>('pin');

  // Shared fields
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // PIN mode fields
  const [pinCode, setPinCode] = useState('');

  // Address mode fields
  const [toAddress, setToAddress] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [contactResults, setContactResults] = useState<ContactResult[]>([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [contactsSynced, setContactsSynced] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Sync contacts on mount (native only)
  useEffect(() => {
    if (!contactsSynced) {
      loadContacts().then(() => setContactsSynced(true));
    }
  }, [contactsSynced, loadContacts]);

  // Debounced contact search
  const searchContacts = useCallback(async (query: string) => {
    if (query.length < 2) {
      setContactResults([]);
      return;
    }
    setSearchingContacts(true);
    try {
      const { data, error: searchError } = await supabase
        .from('contact_book')
        .select('display_name, phone_number')
        .or(
          `display_name.ilike.%${query}%,phone_number.ilike.%${query}%`
        )
        .limit(8);
      if (searchError) throw searchError;
      setContactResults(data ?? []);
    } catch {
      setContactResults([]);
    } finally {
      setSearchingContacts(false);
    }
  }, []);

  const handleContactQueryChange = useCallback(
    (text: string) => {
      setContactQuery(text);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => searchContacts(text), 300);
    },
    [searchContacts]
  );

  const handleSelectContact = useCallback((contact: ContactResult) => {
    setToAddress(contact.phone_number);
    setContactQuery('');
    setContactResults([]);
  }, []);

  if (walletLoading) {
    return <LoadingScreen />;
  }

  const handleSendAll = () => {
    if (wallet) setAmount(wallet.balance.toString());
  };

  // Validate shared fields
  const validateAmount = (): number | null => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E1\u05DB\u05D5\u05DD \u05EA\u05E7\u05D9\u05DF');
      return null;
    }
    if (wallet && numAmount > wallet.balance) {
      setError('\u05D9\u05EA\u05E8\u05D4 \u05DC\u05D0 \u05DE\u05E1\u05E4\u05D9\u05E7\u05D4');
      return null;
    }
    return numAmount;
  };

  // ──────────────────────────────────────────
  // MODE 1: Pay with business PIN code
  // ──────────────────────────────────────────
  const handlePayWithPin = async () => {
    setError('');

    const cleaned = pinCode.replace(/\D/g, '');
    if (cleaned.length !== 4) {
      setError('\u05E7\u05D5\u05D3 \u05EA\u05E9\u05DC\u05D5\u05DD \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA 4 \u05E1\u05E4\u05E8\u05D5\u05EA');
      return;
    }

    const numAmount = validateAmount();
    if (!numAmount) return;

    if (!session?.access_token) {
      setError('\u05DC\u05D0 \u05DE\u05D7\u05D5\u05D1\u05E8 \u2014 \u05E0\u05D0 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DE\u05D7\u05D3\u05E9');
      return;
    }

    try {
      setSending(true);

      const res = await fetch(
        'https://vwpnhzqsafonargpdbsr.supabase.co/functions/v1/partner-settlement-api/validate-pin',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'x-partner-api-key':
              'dils_live_bde45d45250f4de9b895a5a69bdb3219',
          },
          body: JSON.stringify({
            pin_code: cleaned,
            amount_minor: Math.round(numAmount * 100),
            merchant_wallet: wallet!.address,
            description: '\u05EA\u05E9\u05DC\u05D5\u05DD \u05D1\u05D1\u05D9\u05EA \u05E2\u05E1\u05E7',
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05EA\u05E9\u05DC\u05D5\u05DD (${res.status})`
        );
      }

      await refetch();

      Alert.alert(
        '\u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05D4\u05D5\u05E9\u05DC\u05DD!',
        `\u20AA${formatBalance(numAmount)} \u05E9\u05D5\u05DC\u05DE\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`,
        [
          {
            text: '\u05D0\u05D9\u05E9\u05D5\u05E8',
            onPress: () => {
              setPinCode('');
              setAmount('');
              router.push('/(tabs)/home' as any);
            },
          },
        ]
      );
    } catch (err: any) {
      setError(err.message || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05EA\u05E9\u05DC\u05D5\u05DD');
    } finally {
      setSending(false);
    }
  };

  // ──────────────────────────────────────────
  // MODE 2: Send to wallet address / contact
  // ──────────────────────────────────────────
  const handleSendToAddress = async () => {
    setError('');

    if (!toAddress.trim()) {
      setError('\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05E8\u05E0\u05E7 \u05D9\u05E2\u05D3');
      return;
    }

    if (!toAddress.trim().startsWith('0x')) {
      setError('\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05E8\u05E0\u05E7 \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05D1-0x');
      return;
    }

    if (wallet && toAddress.trim() === wallet.address) {
      setError('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05DC\u05D5\u05D7 \u05DC\u05E2\u05E6\u05DE\u05DA');
      return;
    }

    const numAmount = validateAmount();
    if (!numAmount) return;

    if (!session?.access_token) {
      setError('\u05DC\u05D0 \u05DE\u05D7\u05D5\u05D1\u05E8 \u2014 \u05E0\u05D0 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DE\u05D7\u05D3\u05E9');
      return;
    }

    try {
      setSending(true);

      const res = await fetch(
        'https://vwpnhzqsafonargpdbsr.supabase.co/functions/v1/partner-settlement-api/validate-pin',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'x-partner-api-key':
              'dils_live_bde45d45250f4de9b895a5a69bdb3219',
          },
          body: JSON.stringify({
            pin_code: toAddress.trim(),
            amount_minor: Math.round(numAmount * 100),
            merchant_wallet: wallet!.address,
            description: '\u05D4\u05E2\u05D1\u05E8\u05D4 \u05DE\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4',
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DC\u05D9\u05D7\u05D4 (${res.status})`
        );
      }

      await refetch();

      Alert.alert(
        '\u05D4\u05E2\u05D1\u05E8\u05D4 \u05D4\u05D5\u05E9\u05DC\u05DE\u05D4!',
        `\u20AA${formatBalance(numAmount)} \u05E0\u05E9\u05DC\u05D7\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`,
        [
          {
            text: '\u05D0\u05D9\u05E9\u05D5\u05E8',
            onPress: () => {
              setToAddress('');
              setAmount('');
              router.push('/(tabs)/home' as any);
            },
          },
        ]
      );
    } catch (err: any) {
      setError(err.message || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DC\u05D9\u05D7\u05D4');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = mode === 'pin' ? handlePayWithPin : handleSendToAddress;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.xl,
          gap: Spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
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
            {'\u05E9\u05DC\u05D7 DILS'}
          </Text>

          {/* ═══════ Mode Selector ═══════ */}
          <View
            style={{
              flexDirection: 'row-reverse',
              backgroundColor: Colors.card,
              borderRadius: Radius.lg,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: Colors.cardBorder,
              padding: 4,
            }}
          >
            {(
              [
                { key: 'pin' as const, label: '\u05E9\u05DC\u05DD \u05E2\u05DD \u05E7\u05D5\u05D3', icon: '\uD83D\uDD22' },
                { key: 'address' as const, label: '\u05E9\u05DC\u05D7 \u05DC\u05DB\u05EA\u05D5\u05D1\u05EA', icon: '\uD83D\uDCE8' },
              ] as const
            ).map((tab) => {
              const isActive = mode === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => {
                    setMode(tab.key);
                    setError('');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: Spacing.md,
                    borderRadius: Radius.md,
                    borderCurve: 'continuous',
                    backgroundColor: isActive ? Colors.gold : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row-reverse',
                    gap: Spacing.xs,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{tab.icon}</Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: isActive ? Colors.background : Colors.textSecondary,
                      writingDirection: 'rtl',
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ═══════ PIN MODE ═══════ */}
          {mode === 'pin' && (
            <View style={{ gap: Spacing.xl }}>
              {/* Explanation */}
              <View
                style={{
                  backgroundColor: 'rgba(197,160,40,0.08)',
                  borderRadius: Radius.lg,
                  borderCurve: 'continuous',
                  padding: Spacing.lg,
                  flexDirection: 'row-reverse',
                  gap: Spacing.md,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 28 }}>{'\uD83C\uDFEA'}</Text>
                <Text
                  style={{
                    flex: 1,
                    color: Colors.textSecondary,
                    fontSize: 13,
                    textAlign: 'right',
                    writingDirection: 'rtl',
                    lineHeight: 20,
                  }}
                >
                  {'\u05D4\u05D6\u05DF \u05D0\u05EA \u05D4\u05E7\u05D5\u05D3 \u05E9\u05E7\u05D9\u05D1\u05DC\u05EA\n\u05DE\u05D1\u05D9\u05EA \u05D4\u05E2\u05E1\u05E7 \u05DB\u05D3\u05D9 \u05DC\u05E9\u05DC\u05DD'}
                </Text>
              </View>

              {/* 4-Digit PIN Input */}
              <View style={{ gap: Spacing.sm }}>
                <Text
                  style={{
                    color: Colors.gold,
                    fontSize: 14,
                    fontWeight: '600',
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }}
                >
                  {'\u05E7\u05D5\u05D3 \u05EA\u05E9\u05DC\u05D5\u05DD (4 \u05E1\u05E4\u05E8\u05D5\u05EA)'}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: Spacing.md,
                  }}
                >
                  {[0, 1, 2, 3].map((i) => {
                    const digit = pinCode[i] || '';
                    const isFilled = digit.length > 0;
                    return (
                      <View
                        key={i}
                        style={{
                          width: 60,
                          height: 72,
                          borderRadius: Radius.lg,
                          borderCurve: 'continuous',
                          borderWidth: 2,
                          borderColor: isFilled
                            ? Colors.gold
                            : Colors.cardBorder,
                          backgroundColor: isFilled
                            ? 'rgba(197,160,40,0.08)'
                            : Colors.inputBg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 28,
                            fontWeight: '800',
                            color: Colors.white,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {digit}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                {/* Hidden input for keyboard */}
                <TextInput
                  value={pinCode}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, '').slice(0, 4);
                    setPinCode(digits);
                    setError('');
                  }}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus={false}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: 72,
                    top: 28,
                  }}
                />
                {/* Tap area to focus */}
                <Pressable
                  onPress={() => {
                    // The hidden TextInput handles keyboard
                  }}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: 72,
                    top: 28,
                  }}
                />
              </View>
            </View>
          )}

          {/* ═══════ ADDRESS MODE ═══════ */}
          {mode === 'address' && (
            <View style={{ gap: Spacing.xl }}>
              {/* Contact Search */}
              <View style={{ gap: Spacing.sm }}>
                <Text
                  style={{
                    color: Colors.gold,
                    fontSize: 14,
                    fontWeight: '600',
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }}
                >
                  {'\u05E9\u05DC\u05D7 \u05DC\u05D0\u05D9\u05E9 \u05E7\u05E9\u05E8'}
                </Text>
                <View
                  style={{
                    flexDirection: 'row-reverse',
                    alignItems: 'center',
                    backgroundColor: Colors.inputBg,
                    borderRadius: Radius.lg,
                    borderCurve: 'continuous',
                    borderWidth: 1.5,
                    borderColor: Colors.cardBorder,
                    paddingHorizontal: Spacing.lg,
                  }}
                >
                  <Text style={{ fontSize: 16, marginLeft: Spacing.sm }}>
                    {'\uD83D\uDD0D'}
                  </Text>
                  <TextInput
                    placeholder={
                      '\u05D7\u05E4\u05E9 \u05E9\u05DD \u05D0\u05D5 \u05D8\u05DC\u05E4\u05D5\u05DF...'
                    }
                    placeholderTextColor={Colors.textTertiary}
                    value={contactQuery}
                    onChangeText={handleContactQueryChange}
                    autoCapitalize="none"
                    autoCorrect={false}
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
                </View>

                {searchingContacts && (
                  <View
                    style={{
                      alignItems: 'center',
                      paddingVertical: Spacing.sm,
                    }}
                  >
                    <ActivityIndicator color={Colors.gold} size="small" />
                  </View>
                )}

                {/* Contact Results */}
                {contactResults.length > 0 && (
                  <View
                    style={{
                      backgroundColor: Colors.card,
                      borderRadius: Radius.lg,
                      borderCurve: 'continuous',
                      borderWidth: 1,
                      borderColor: Colors.cardBorder,
                      overflow: 'hidden',
                    }}
                  >
                    {contactResults.map((contact, index) => (
                      <Pressable
                        key={`${contact.phone_number}-${index}`}
                        onPress={() => handleSelectContact(contact)}
                        style={({ pressed }) => ({
                          flexDirection: 'row-reverse',
                          alignItems: 'center',
                          gap: Spacing.md,
                          paddingVertical: Spacing.md,
                          paddingHorizontal: Spacing.lg,
                          backgroundColor: pressed
                            ? 'rgba(197,160,40,0.08)'
                            : 'transparent',
                          borderBottomWidth:
                            index < contactResults.length - 1 ? 0.5 : 0,
                          borderBottomColor: Colors.cardBorder,
                        })}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: 'rgba(197,160,40,0.12)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 16 }}>
                            {'\uD83D\uDC64'}
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
                            {contact.display_name}
                          </Text>
                          <Text
                            style={{
                              color: Colors.textSecondary,
                              fontSize: 13,
                              textAlign: 'right',
                              fontVariant: ['tabular-nums'],
                            }}
                          >
                            {contact.phone_number}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {contactQuery.length >= 2 &&
                  !searchingContacts &&
                  contactResults.length === 0 && (
                    <Text
                      style={{
                        color: Colors.textSecondary,
                        fontSize: 13,
                        textAlign: 'center',
                        writingDirection: 'rtl',
                        paddingVertical: Spacing.sm,
                      }}
                    >
                      {'\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05D0\u05E0\u05E9\u05D9 \u05E7\u05E9\u05E8'}
                    </Text>
                  )}
              </View>

              {/* Wallet Address Input */}
              <GoldInput
                label={'\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05E8\u05E0\u05E7 \u05D9\u05E2\u05D3'}
                placeholder="0x..."
                value={toAddress}
                onChangeText={(text) => {
                  setToAddress(text);
                  setError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* QR Scan Button */}
              <Pressable
                onPress={() => {
                  Alert.alert(
                    '\u05E1\u05E8\u05D9\u05E7\u05EA QR',
                    '\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 \u05D6\u05D5 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05D1\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05D4\u05DE\u05D5\u05D1\u05D9\u05D9\u05DC'
                  );
                }}
                style={({ pressed }) => ({
                  backgroundColor: Colors.card,
                  borderRadius: Radius.lg,
                  borderCurve: 'continuous',
                  borderWidth: 1.5,
                  borderColor: Colors.cardBorder,
                  paddingVertical: Spacing.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row-reverse',
                  gap: Spacing.sm,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 16 }}>{'\uD83D\uDCF7'}</Text>
                <Text
                  style={{
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: '600',
                    writingDirection: 'rtl',
                  }}
                >
                  {'\u05E1\u05E8\u05D5\u05E7 QR'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* ═══════ SHARED: Amount + Submit ═══════ */}
          <View style={{ gap: Spacing.sm }}>
            <GoldInput
              label={'\u05E1\u05DB\u05D5\u05DD DILS'}
              placeholder={'\u20AA0.00'}
              value={amount}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                setAmount(cleaned);
                setError('');
              }}
              keyboardType="decimal-pad"
            />
            <Pressable onPress={handleSendAll} hitSlop={8}>
              <Text
                style={{
                  color: Colors.gold,
                  fontSize: 14,
                  fontWeight: '600',
                  textAlign: 'right',
                  writingDirection: 'rtl',
                  textDecorationLine: 'underline',
                }}
              >
                {'\u05E9\u05DC\u05D7 \u05D4\u05DB\u05DC'}
              </Text>
            </Pressable>
          </View>

          {/* Balance info */}
          {wallet && (
            <View
              style={{
                flexDirection: 'row-reverse',
                justifyContent: 'space-between',
                paddingHorizontal: Spacing.xs,
              }}
            >
              <Text
                style={{
                  color: Colors.textSecondary,
                  fontSize: 13,
                  writingDirection: 'rtl',
                }}
              >
                {'\u05D9\u05EA\u05E8\u05D4 \u05D6\u05DE\u05D9\u05E0\u05D4:'}
              </Text>
              <Text
                style={{
                  color: Colors.textSecondary,
                  fontSize: 13,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {'\u20AA'}
                {formatBalance(wallet.balance)}
              </Text>
            </View>
          )}

          {/* Error */}
          {error ? (
            <Text
              selectable
              style={{
                color: Colors.error,
                fontSize: 14,
                textAlign: 'right',
                writingDirection: 'rtl',
              }}
            >
              {error}
            </Text>
          ) : null}

          {/* Submit */}
          <GoldButton
            title={
              mode === 'pin'
                ? '\u05E9\u05DC\u05DD \u05E2\u05DB\u05E9\u05D9\u05D5'
                : '\u05D4\u05DE\u05E9\u05DA'
            }
            icon={mode === 'pin' ? '\uD83D\uDCB3' : '\u2191'}
            onPress={handleSubmit}
            loading={sending}
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
