import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@fastshot/auth';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { LoadingScreen } from '@/components/loading-screen';
import { ErrorState } from '@/components/error-state';
import { GoldButton } from '@/components/gold-button';

interface Club {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  category: string;
}

interface UserClub {
  id: string;
  club_id: string;
  membership_status: string;
  points_balance: number;
  joined_at: string;
  clubs: Club;
}

const CATEGORY_ICONS: Record<string, string> = {
  retail: '\uD83D\uDED2',
  fashion: '\uD83D\uDC57',
  health: '\uD83D\uDC8A',
  food: '\uD83C\uDF54',
  general: '\u2B50',
};

export default function ClubsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [myClubs, setMyClubs] = useState<UserClub[]>([]);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [tab, setTab] = useState<'my' | 'all'>('my');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const fetchClubs = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const [myRes, allRes] = await Promise.all([
        supabase
          .from('club_members')
          .select('id, club_id, membership_status, points_balance, joined_at, clubs(*)')
          .eq('profile_id', user.id),
        supabase
          .from('clubs')
          .select('*')
          .eq('is_active', true)
          .order('name'),
      ]);

      // Handle table-not-found errors gracefully (42P01 or relation does not exist)
      const isTableMissing = (err: any) =>
        err?.code === '42P01' || err?.message?.includes('relation') && err?.message?.includes('does not exist');

      if (myRes.error && !isTableMissing(myRes.error)) throw myRes.error;
      if (allRes.error && !isTableMissing(allRes.error)) throw allRes.error;

      setMyClubs(myRes.error ? [] : ((myRes.data as any) || []));
      setAllClubs(allRes.error ? [] : (allRes.data || []));
    } catch (err: any) {
      // If the error is about missing tables, show empty state instead of error
      const msg = err.message || '';
      if (err.code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'))) {
        setMyClubs([]);
        setAllClubs([]);
      } else {
        setError(msg || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05DE\u05D5\u05E2\u05D3\u05D5\u05E0\u05D9\u05DD');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClubs();
    setRefreshing(false);
  };

  const handleJoinClub = async (clubId: string, clubName: string) => {
    if (!user) return;

    setJoiningId(clubId);
    try {
      const { error: joinError } = await supabase
        .from('club_members')
        .insert({
          profile_id: user.id,
          club_id: clubId,
          membership_status: 'active',
          points_balance: 0,
        });

      if (joinError) {
        if (joinError.message.includes('duplicate')) {
          Alert.alert('\u05DB\u05D1\u05E8 \u05D7\u05D1\u05E8', `\u05D0\u05EA\u05D4 \u05DB\u05D1\u05E8 \u05D7\u05D1\u05E8 \u05D1\u05DE\u05D5\u05E2\u05D3\u05D5\u05DF ${clubName}`);
        } else {
          throw joinError;
        }
      } else {
        Alert.alert('\u05D4\u05E6\u05D8\u05E8\u05E4\u05EA!', `\u05D4\u05D5\u05E1\u05E4\u05EA \u05DC\u05DE\u05D5\u05E2\u05D3\u05D5\u05DF ${clubName}`);
        await fetchClubs();
      }
    } catch (err: any) {
      Alert.alert('\u05E9\u05D2\u05D9\u05D0\u05D4', err.message || '\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05E6\u05D8\u05E8\u05E3');
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) {
    return <LoadingScreen message={'\u05D8\u05D5\u05E2\u05DF \u05DE\u05D5\u05E2\u05D3\u05D5\u05E0\u05D9\u05DD...'} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchClubs} />;
  }

  const myClubIds = new Set(myClubs.map((uc) => uc.club_id));
  const availableClubs = allClubs.filter((c) => !myClubIds.has(c.id));

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
          {'\u05DE\u05D5\u05E2\u05D3\u05D5\u05E0\u05D9\u05DD'}
        </Text>

        {/* Tab selector */}
        <View
          style={{
            flexDirection: 'row-reverse',
            gap: Spacing.sm,
          }}
        >
          {(['my', 'all'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{
                paddingVertical: Spacing.sm,
                paddingHorizontal: Spacing.lg,
                borderRadius: Radius.full,
                borderCurve: 'continuous',
                backgroundColor: tab === t ? Colors.gold : 'transparent',
                borderWidth: tab === t ? 0 : 1,
                borderColor: Colors.cardBorder,
              }}
            >
              <Text
                style={{
                  color: tab === t ? Colors.background : Colors.textSecondary,
                  fontSize: 14,
                  fontWeight: '600',
                  writingDirection: 'rtl',
                }}
              >
                {t === 'my' ? '\u05D4\u05DE\u05D5\u05E2\u05D3\u05D5\u05E0\u05D9\u05DD \u05E9\u05DC\u05D9' : '\u05DB\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3\u05D5\u05E0\u05D9\u05DD'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* My Clubs */}
        {tab === 'my' && (
          <View style={{ gap: Spacing.md }}>
            {myClubs.length === 0 ? (
              <View
                style={{
                  paddingVertical: 60,
                  alignItems: 'center',
                  gap: Spacing.sm,
                }}
              >
                <Text style={{ fontSize: 32, opacity: 0.3 }}>{'\uD83C\uDFC6'}</Text>
                <Text
                  style={{
                    color: Colors.textSecondary,
                    fontSize: 15,
                    textAlign: 'center',
                    writingDirection: 'rtl',
                    lineHeight: 22,
                  }}
                >
                  {'\u05D0\u05D9\u05DF \u05DE\u05D5\u05E2\u05D3\u05D5\u05E0\u05D9\u05DD \u05E2\u05D3\u05D9\u05D9\u05DF\n\u05D4\u05E6\u05D8\u05E8\u05E3 \u05DC\u05DE\u05D5\u05E2\u05D3\u05D5\u05E0\u05D9\u05DD \u05D5\u05E6\u05D1\u05D5\u05E8 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA!'}
                </Text>
                <GoldButton
                  title={'\u05E2\u05D9\u05D9\u05DF \u05DE\u05D5\u05E2\u05D3\u05D5\u05E0\u05D9\u05DD'}
                  variant="outline"
                  onPress={() => setTab('all')}
                  fullWidth={false}
                  style={{ marginTop: Spacing.md, paddingHorizontal: 32 }}
                />
              </View>
            ) : (
              myClubs.map((uc) => {
                const club = uc.clubs;
                return (
                  <View
                    key={uc.id}
                    style={{
                      backgroundColor: Colors.card,
                      borderRadius: Radius.lg,
                      borderCurve: 'continuous',
                      borderWidth: 1,
                      borderColor: Colors.cardBorder,
                      padding: Spacing.lg,
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                      gap: Spacing.md,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: 'rgba(197,160,40,0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>
                        {CATEGORY_ICONS[club.category] || '\u2B50'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: '700',
                          textAlign: 'right',
                          writingDirection: 'rtl',
                        }}
                      >
                        {club.name}
                      </Text>
                      {club.description && (
                        <Text
                          style={{
                            color: Colors.textSecondary,
                            fontSize: 13,
                            textAlign: 'right',
                            writingDirection: 'rtl',
                          }}
                          numberOfLines={1}
                        >
                          {club.description}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'center', gap: 2 }}>
                      <Text
                        style={{
                          color: Colors.gold,
                          fontSize: 18,
                          fontWeight: '700',
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {uc.points_balance}
                      </Text>
                      <Text
                        style={{
                          color: Colors.textTertiary,
                          fontSize: 11,
                          writingDirection: 'rtl',
                        }}
                      >
                        {'\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* All Clubs */}
        {tab === 'all' && (
          <View style={{ gap: Spacing.md }}>
            {availableClubs.length === 0 && myClubs.length === allClubs.length ? (
              <View
                style={{
                  paddingVertical: 60,
                  alignItems: 'center',
                  gap: Spacing.sm,
                }}
              >
                <Text style={{ fontSize: 32 }}>{'\uD83C\uDF89'}</Text>
                <Text
                  style={{
                    color: Colors.textSecondary,
                    fontSize: 15,
                    textAlign: 'center',
                    writingDirection: 'rtl',
                  }}
                >
                  {'\u05D0\u05EA\u05D4 \u05D7\u05D1\u05E8 \u05D1\u05DB\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3\u05D5\u05E0\u05D9\u05DD!'}
                </Text>
              </View>
            ) : (
              allClubs.map((club) => {
                const isMember = myClubIds.has(club.id);
                return (
                  <View
                    key={club.id}
                    style={{
                      backgroundColor: Colors.card,
                      borderRadius: Radius.lg,
                      borderCurve: 'continuous',
                      borderWidth: 1,
                      borderColor: isMember ? Colors.gold : Colors.cardBorder,
                      padding: Spacing.lg,
                      gap: Spacing.md,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row-reverse',
                        alignItems: 'center',
                        gap: Spacing.md,
                      }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: 'rgba(197,160,40,0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 22 }}>
                          {CATEGORY_ICONS[club.category] || '\u2B50'}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: '700',
                            textAlign: 'right',
                            writingDirection: 'rtl',
                          }}
                        >
                          {club.name}
                        </Text>
                        {club.description && (
                          <Text
                            style={{
                              color: Colors.textSecondary,
                              fontSize: 13,
                              textAlign: 'right',
                              writingDirection: 'rtl',
                            }}
                            numberOfLines={2}
                          >
                            {club.description}
                          </Text>
                        )}
                      </View>
                    </View>
                    {isMember ? (
                      <View
                        style={{
                          backgroundColor: 'rgba(52,199,89,0.1)',
                          borderRadius: Radius.full,
                          paddingVertical: Spacing.sm,
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: Colors.success,
                            fontSize: 14,
                            fontWeight: '600',
                            writingDirection: 'rtl',
                          }}
                        >
                          {'\u2713 \u05D7\u05D1\u05E8 \u05DE\u05D5\u05E2\u05D3\u05D5\u05DF'}
                        </Text>
                      </View>
                    ) : (
                      <GoldButton
                        title={'\u05D4\u05E6\u05D8\u05E8\u05E3'}
                        onPress={() => handleJoinClub(club.id, club.name)}
                        loading={joiningId === club.id}
                      />
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}
