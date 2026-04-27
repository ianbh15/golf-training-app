import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useRoundStore } from '../../../lib/store/roundStore';
import { Card } from '../../../components/ui/Card';
import { MetricBadge } from '../../../components/ui/MetricBadge';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function scoreColor(score: number): string {
  if (score <= 70) return '#4ADE80';
  if (score <= 74) return '#F0F2F0';
  return '#F59E0B';
}

function mentalLabel(v: number | null): string {
  if (!v) return '';
  return { 1: 'Off', 2: 'Shaky', 3: 'Solid', 4: 'Sharp', 5: 'Locked' }[v] ?? '';
}

export default function RoundsHistoryScreen() {
  const { rounds, fetchRounds, isLoading } = useRoundStore();
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchRounds(data.user.id);
      }
    });
  }, []);

  const onRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    await fetchRounds(userId);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0F0E' }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#2A2E2C',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <View>
          <Text
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 10,
              color: '#4ADE80',
              letterSpacing: 3,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Score Card
          </Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#F0F2F0' }}>
            Rounds
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/rounds/log')}
          accessibilityLabel="Log a new round"
          style={{
            height: 36,
            paddingHorizontal: 16,
            backgroundColor: '#4ADE80',
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'Outfit_700Bold',
              fontSize: 12,
              color: '#0D0F0E',
              letterSpacing: 0.5,
            }}
          >
            + LOG ROUND
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#4ADE80" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4ADE80" />
          }
        >
          {rounds.length === 0 ? (
            <Card>
              <Text
                style={{
                  fontFamily: 'Outfit_400Regular',
                  fontSize: 14,
                  color: '#8A8F8C',
                  textAlign: 'center',
                  paddingVertical: 20,
                }}
              >
                No rounds logged yet.{'\n'}Tap "+ LOG ROUND" to add your first.
              </Text>
            </Card>
          ) : (
            rounds.map((round) => (
              <Card key={round.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text
                      style={{
                        fontFamily: 'Outfit_700Bold',
                        fontSize: 16,
                        color: '#F0F2F0',
                        marginBottom: 2,
                      }}
                      numberOfLines={1}
                    >
                      {round.course_name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMMono_400Regular',
                        fontSize: 11,
                        color: '#8A8F8C',
                        marginBottom: 8,
                      }}
                    >
                      {formatDate(round.played_date)}
                    </Text>

                    {/* SG row */}
                    {(round.sg_off_tee != null ||
                      round.sg_approach != null ||
                      round.sg_around_green != null ||
                      round.sg_putting != null) && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {[
                          { label: 'OTT', val: round.sg_off_tee },
                          { label: 'APP', val: round.sg_approach },
                          { label: 'ARG', val: round.sg_around_green },
                          { label: 'PUT', val: round.sg_putting },
                        ]
                          .filter((x) => x.val != null)
                          .map((x) => (
                            <MetricBadge
                              key={x.label}
                              value={`${x.label} ${x.val! >= 0 ? '+' : ''}${x.val!.toFixed(2)}`}
                              met={x.val! >= 0}
                            />
                          ))}
                      </View>
                    )}

                    {/* Mental state */}
                    {round.mental_state && (
                      <Text
                        style={{
                          fontFamily: 'Outfit_400Regular',
                          fontSize: 11,
                          color: '#4A4E4C',
                          marginTop: 6,
                        }}
                      >
                        Mental: {mentalLabel(round.mental_state)}
                      </Text>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        fontFamily: 'DMMono_500Medium',
                        fontSize: 32,
                        color: scoreColor(round.gross_score),
                        lineHeight: 36,
                      }}
                    >
                      {round.gross_score}
                    </Text>
                    {round.handicap_differential != null && (
                      <Text
                        style={{
                          fontFamily: 'DMMono_400Regular',
                          fontSize: 11,
                          color: '#4A4E4C',
                          marginTop: 2,
                        }}
                      >
                        {round.handicap_differential > 0 ? '+' : ''}
                        {round.handicap_differential} diff
                      </Text>
                    )}
                    {round.course_rating && round.slope && (
                      <Text
                        style={{
                          fontFamily: 'DMMono_400Regular',
                          fontSize: 10,
                          color: '#4A4E4C',
                          marginTop: 2,
                        }}
                      >
                        {round.course_rating}/{round.slope}
                      </Text>
                    )}
                  </View>
                </View>

                {round.key_moment ? (
                  <Text
                    style={{
                      fontFamily: 'Outfit_400Regular',
                      fontSize: 12,
                      color: '#8A8F8C',
                      marginTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: '#2A2E2C',
                      paddingTop: 10,
                      fontStyle: 'italic',
                    }}
                    numberOfLines={2}
                  >
                    "{round.key_moment}"
                  </Text>
                ) : null}
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
