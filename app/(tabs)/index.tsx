import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { MetricBadge } from '../../components/ui/MetricBadge';
import {
  getTodayPracticeDay,
  getNextPracticeDay,
  getRoutineForDay,
} from '../../constants/routine';
import type { Round, AiInsight, HandicapEntry } from '../../lib/types/database';

// ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function todayDisplay(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function scoreColor(score: number): string {
  if (score <= 70) return '#4ADE80';
  if (score <= 74) return '#F0F2F0';
  return '#F59E0B';
}

// ──────────────────────────────────────────────────────────

export default function TodayScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [latestRound, setLatestRound] = useState<Round | null>(null);
  const [latestInsight, setLatestInsight] = useState<AiInsight | null>(null);
  const [latestHandicap, setLatestHandicap] = useState<HandicapEntry | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [insightExpanded, setInsightExpanded] = useState(false);

  const todayDay = getTodayPracticeDay();
  const routine = todayDay ? getRoutineForDay(todayDay) : null;

  const fetchData = async (uid: string) => {
    const [roundRes, insightRes, handicapRes, streakRes] = await Promise.all([
      supabase
        .from('rounds')
        .select('*')
        .eq('user_id', uid)
        .order('played_date', { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', uid)
        .in('insight_type', ['pre_session', 'weekly_summary'])
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from('handicap_history')
        .select('*')
        .eq('user_id', uid)
        .order('recorded_date', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Count consecutive weeks (last 8 weeks) with all 3 sessions
      supabase
        .from('practice_sessions')
        .select('session_date, day_type')
        .eq('user_id', uid)
        .order('session_date', { ascending: false })
        .limit(24),
    ]);

    if (roundRes.data) setLatestRound(roundRes.data);
    if (insightRes.data) setLatestInsight(insightRes.data);
    if (handicapRes.data) setLatestHandicap(handicapRes.data);

    // Compute streak (consecutive weeks with tue+wed+thu)
    if (streakRes.data) {
      setStreak(computeStreak(streakRes.data));
    }
  };

  function computeStreak(
    sessions: { session_date: string; day_type: string }[]
  ): number {
    if (!sessions.length) return 0;

    // Group by ISO week
    const weekMap = new Map<string, Set<string>>();
    sessions.forEach(({ session_date, day_type }) => {
      const d = new Date(session_date);
      // ISO week key: year-week
      const jan4 = new Date(d.getFullYear(), 0, 4);
      const week = Math.ceil(
        ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7
      );
      const key = `${d.getFullYear()}-W${week}`;
      if (!weekMap.has(key)) weekMap.set(key, new Set());
      weekMap.get(key)!.add(day_type);
    });

    let streak = 0;
    const sortedWeeks = [...weekMap.keys()].sort().reverse();
    for (const week of sortedWeeks) {
      const days = weekMap.get(week)!;
      if (
        days.has('tuesday') &&
        days.has('wednesday') &&
        days.has('thursday')
      ) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchData(data.user.id);
      }
    });
  }, []);

  const onRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    await fetchData(userId);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0F0E' }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4ADE80"
          />
        }
      >
        {/* ── Header ── */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontFamily: 'DMMono_400Regular',
              fontSize: 11,
              color: '#4ADE80',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {todayDisplay()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
            <Text
              style={{
                fontFamily: 'Outfit_700Bold',
                fontSize: 28,
                color: '#F0F2F0',
              }}
            >
              Golf Performance OS
            </Text>
          </View>
          {latestHandicap && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
              <Text
                style={{
                  fontFamily: 'DMMono_400Regular',
                  fontSize: 12,
                  color: '#8A8F8C',
                }}
              >
                HCP INDEX
              </Text>
              <Text
                style={{
                  fontFamily: 'DMMono_500Medium',
                  fontSize: 20,
                  color: '#4ADE80',
                }}
              >
                {latestHandicap.handicap_index.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Today's Session Card ── */}
        {routine ? (
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text
                style={{
                  fontFamily: 'DMMono_500Medium',
                  fontSize: 10,
                  color: '#4ADE80',
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                }}
              >
                {routine.day.toUpperCase()} SESSION
              </Text>
              <Text
                style={{
                  fontFamily: 'DMMono_400Regular',
                  fontSize: 10,
                  color: '#4A4E4C',
                }}
              >
                {routine.totalMinutes} MIN
              </Text>
            </View>
            <Text
              style={{
                fontFamily: 'Outfit_700Bold',
                fontSize: 20,
                color: '#F0F2F0',
                marginBottom: 6,
              }}
            >
              {routine.focus}
            </Text>
            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 13,
                color: '#8A8F8C',
                marginBottom: 16,
              }}
            >
              {routine.blocks.length} blocks · {routine.blocks.filter((b) => b.neverCut).length} never-cut
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/practice/session',
                  params: { day: routine.day },
                })
              }
              accessibilityLabel="Start today's practice session"
              style={{
                height: 46,
                backgroundColor: '#4ADE80',
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
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
                START SESSION
              </Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <Card style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 10,
                color: '#4A4E4C',
                textTransform: 'uppercase',
                letterSpacing: 2,
                marginBottom: 6,
              }}
            >
              Rest Day
            </Text>
            <Text
              style={{
                fontFamily: 'Outfit_700Bold',
                fontSize: 16,
                color: '#F0F2F0',
              }}
            >
              Next session: {getNextPracticeDay()}
            </Text>
          </Card>
        )}

        {/* ── Streak Badge ── */}
        {streak > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text
                style={{
                  fontFamily: 'DMMono_500Medium',
                  fontSize: 28,
                  color: '#4ADE80',
                }}
              >
                {streak}
              </Text>
              <View>
                <Text
                  style={{
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 14,
                    color: '#F0F2F0',
                  }}
                >
                  Week{streak !== 1 ? 's' : ''} Complete
                </Text>
                <Text
                  style={{
                    fontFamily: 'Outfit_400Regular',
                    fontSize: 12,
                    color: '#8A8F8C',
                  }}
                >
                  Consecutive full weeks (Tue · Wed · Thu)
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── Last Round ── */}
        {latestRound && (
          <Card style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 10,
                color: '#8A8F8C',
                textTransform: 'uppercase',
                letterSpacing: 2,
                marginBottom: 10,
              }}
            >
              Last Round
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 17,
                    color: '#F0F2F0',
                    marginBottom: 2,
                  }}
                  numberOfLines={1}
                >
                  {latestRound.course_name}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Outfit_400Regular',
                    fontSize: 12,
                    color: '#8A8F8C',
                  }}
                >
                  {formatDateShort(latestRound.played_date)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontFamily: 'DMMono_500Medium',
                    fontSize: 28,
                    color: scoreColor(latestRound.gross_score),
                    lineHeight: 32,
                  }}
                >
                  {latestRound.gross_score}
                </Text>
                {latestRound.handicap_differential != null && (
                  <Text
                    style={{
                      fontFamily: 'DMMono_400Regular',
                      fontSize: 11,
                      color: '#4A4E4C',
                    }}
                  >
                    +{latestRound.handicap_differential} diff
                  </Text>
                )}
              </View>
            </View>
            {(latestRound.sg_off_tee != null ||
              latestRound.sg_approach != null ||
              latestRound.sg_around_green != null ||
              latestRound.sg_putting != null) && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  marginTop: 12,
                  flexWrap: 'wrap',
                }}
              >
                {[
                  { label: 'OTT', value: latestRound.sg_off_tee },
                  { label: 'APP', value: latestRound.sg_approach },
                  { label: 'ARG', value: latestRound.sg_around_green },
                  { label: 'PUT', value: latestRound.sg_putting },
                ]
                  .filter((sg) => sg.value != null)
                  .map((sg) => (
                    <MetricBadge
                      key={sg.label}
                      value={`${sg.label} ${sg.value! >= 0 ? '+' : ''}${sg.value!.toFixed(2)}`}
                      met={sg.value! >= 0}
                    />
                  ))}
              </View>
            )}
          </Card>
        )}

        {/* ── AI Insight Card ── */}
        {latestInsight && (
          <TouchableOpacity onPress={() => setInsightExpanded((v) => !v)} activeOpacity={0.85}>
            <Card style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text
                  style={{
                    fontFamily: 'DMMono_500Medium',
                    fontSize: 10,
                    color: '#4ADE80',
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                  }}
                >
                  Coach · {latestInsight.insight_type.replace('_', ' ')}
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMMono_400Regular',
                    fontSize: 10,
                    color: '#4A4E4C',
                  }}
                >
                  {formatDate(latestInsight.generated_at)}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: 'Outfit_400Regular',
                  fontSize: 14,
                  color: '#F0F2F0',
                  lineHeight: 21,
                }}
                numberOfLines={insightExpanded ? undefined : 3}
              >
                {latestInsight.content}
              </Text>
              {!insightExpanded && (
                <Text
                  style={{
                    fontFamily: 'Outfit_400Regular',
                    fontSize: 12,
                    color: '#4ADE80',
                    marginTop: 6,
                  }}
                >
                  Tap to expand
                </Text>
              )}
            </Card>
          </TouchableOpacity>
        )}

        {/* ── Quick Links ── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/rounds/log')}
            style={{
              flex: 1,
              height: 44,
              borderWidth: 1,
              borderColor: '#2A2E2C',
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1A1D1B',
            }}
          >
            <Text
              style={{
                fontFamily: 'Outfit_600SemiBold',
                fontSize: 12,
                color: '#8A8F8C',
                letterSpacing: 0.5,
              }}
            >
              LOG ROUND
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/coach')}
            style={{
              flex: 1,
              height: 44,
              borderWidth: 1,
              borderColor: '#2A2E2C',
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1A1D1B',
            }}
          >
            <Text
              style={{
                fontFamily: 'Outfit_600SemiBold',
                fontSize: 12,
                color: '#8A8F8C',
                letterSpacing: 0.5,
              }}
            >
              AI COACH
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
