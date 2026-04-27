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
import { Card } from '../../../components/ui/Card';
import { getTodayPracticeDay, getRoutineForDay } from '../../../constants/routine';
import type { PracticeSession } from '../../../lib/types/database';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function qualityColor(q: number | null): string {
  if (!q) return '#4A4E4C';
  if (q >= 4) return '#4ADE80';
  if (q >= 3) return '#F0F2F0';
  return '#F59E0B';
}

function dayLabel(day: string): string {
  return { tuesday: 'TUE · Ball Striking', wednesday: 'WED · Short Game', thursday: 'THU · Scoring' }[day] ?? day.toUpperCase();
}

export default function PracticeHistoryScreen() {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchSessions = async (uid: string) => {
    const { data } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', uid)
      .order('session_date', { ascending: false })
      .limit(40);
    if (data) setSessions(data);
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        await fetchSessions(data.user.id);
      }
      setLoading(false);
    });
  }, []);

  const onRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    await fetchSessions(userId);
    setRefreshing(false);
  };

  const todayDay = getTodayPracticeDay();
  const todayRoutine = todayDay ? getRoutineForDay(todayDay) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0F0E' }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#2A2E2C',
        }}
      >
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
          Practice Log
        </Text>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#F0F2F0' }}>
          Sessions
        </Text>
      </View>

      {loading ? (
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
          {/* Start today's session CTA */}
          {todayRoutine && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/practice/session',
                  params: { day: todayRoutine.day },
                })
              }
              accessibilityLabel="Start today's practice session"
              style={{
                height: 50,
                backgroundColor: '#4ADE80',
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Outfit_700Bold',
                  fontSize: 14,
                  color: '#0D0F0E',
                  letterSpacing: 1,
                }}
              >
                START {todayRoutine.day.toUpperCase()} SESSION
              </Text>
            </TouchableOpacity>
          )}

          {/* Session list */}
          {sessions.length === 0 ? (
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
                No sessions logged yet.{'\n'}Start your first session above.
              </Text>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card key={session.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: 'DMMono_500Medium',
                        fontSize: 10,
                        color: '#4ADE80',
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                        marginBottom: 4,
                      }}
                    >
                      {dayLabel(session.day_type)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Outfit_700Bold',
                        fontSize: 16,
                        color: '#F0F2F0',
                        marginBottom: 2,
                      }}
                    >
                      {formatDate(session.session_date)}
                    </Text>
                    {session.notes ? (
                      <Text
                        style={{
                          fontFamily: 'Outfit_400Regular',
                          fontSize: 12,
                          color: '#8A8F8C',
                          marginTop: 4,
                        }}
                        numberOfLines={2}
                      >
                        {session.notes}
                      </Text>
                    ) : null}
                  </View>
                  {session.overall_quality && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={{
                          fontFamily: 'DMMono_500Medium',
                          fontSize: 26,
                          color: qualityColor(session.overall_quality),
                          lineHeight: 30,
                        }}
                      >
                        {session.overall_quality}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'DMMono_400Regular',
                          fontSize: 9,
                          color: '#4A4E4C',
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}
                      >
                        /5
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
