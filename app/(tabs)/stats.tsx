import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import type { Round, PracticeSession, SessionBlock, HandicapEntry } from '../../lib/types/database';

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default function StatsScreen() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [blocks, setBlocks] = useState<SessionBlock[]>([]);
  const [handicapHistory, setHandicapHistory] = useState<HandicapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchAll = async (uid: string) => {
    const [r, s, b, h] = await Promise.all([
      supabase.from('rounds').select('*').eq('user_id', uid).order('played_date', { ascending: false }).limit(20),
      supabase.from('practice_sessions').select('*').eq('user_id', uid).order('session_date', { ascending: false }).limit(24),
      supabase.from('session_blocks').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('handicap_history').select('*').eq('user_id', uid).order('recorded_date', { ascending: false }).limit(20),
    ]);
    if (r.data) setRounds(r.data);
    if (s.data) setSessions(s.data);
    if (b.data) setBlocks(b.data);
    if (h.data) setHandicapHistory(h.data);
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        await fetchAll(data.user.id);
      }
      setLoading(false);
    });
  }, []);

  // ── Computed stats ──
  const recentRounds = rounds.slice(0, 10);
  const avgSG = {
    ott: avg(recentRounds.map((r) => r.sg_off_tee ?? 0).filter((_, i) => recentRounds[i].sg_off_tee != null)),
    app: avg(recentRounds.map((r) => r.sg_approach ?? 0).filter((_, i) => recentRounds[i].sg_approach != null)),
    arg: avg(recentRounds.map((r) => r.sg_around_green ?? 0).filter((_, i) => recentRounds[i].sg_around_green != null)),
    put: avg(recentRounds.map((r) => r.sg_putting ?? 0).filter((_, i) => recentRounds[i].sg_putting != null)),
  };

  const sequenceBlocks = blocks.filter((b) => b.sequence_felt_right != null);
  const sequencePct = sequenceBlocks.length
    ? Math.round((sequenceBlocks.filter((b) => b.sequence_felt_right).length / sequenceBlocks.length) * 100)
    : null;

  const pressureBlocks = blocks
    .filter((b) => b.block_key === 'tuesday_pressure_finish' && b.metric_result)
    .slice(0, 8)
    .reverse();

  const latestHandicap = handicapHistory[0];

  function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#2A2E2C',
        }}
      >
        <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 14, color: '#8A8F8C' }}>
          {label}
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 18, color: '#F0F2F0' }}>
            {value}
          </Text>
          {sub && (
            <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 10, color: '#4A4E4C' }}>
              {sub}
            </Text>
          )}
        </View>
      </View>
    );
  }

  function SGBar({ label, value }: { label: string; value: number | null }) {
    if (value === null) return null;
    const color = value >= 0 ? '#4ADE80' : '#F59E0B';
    const barWidth = Math.min(Math.abs(value) * 30, 100); // scale for display
    return (
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 13, color: '#8A8F8C' }}>
            {label}
          </Text>
          <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 13, color }}>
            {value >= 0 ? '+' : ''}{value.toFixed(2)}
          </Text>
        </View>
        <View style={{ height: 4, backgroundColor: '#1A1D1B', borderRadius: 2, overflow: 'hidden' }}>
          <View
            style={{
              height: 4,
              width: `${barWidth}%`,
              backgroundColor: color,
              borderRadius: 2,
            }}
          />
        </View>
      </View>
    );
  }

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
          Pattern Visibility
        </Text>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#F0F2F0' }}>
          Stats
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#4ADE80" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

          {/* Phase 5 notice */}
          <Card style={{ marginBottom: 20, borderColor: '#2A2E2C' }}>
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 10,
                color: '#F59E0B',
                textTransform: 'uppercase',
                letterSpacing: 2,
                marginBottom: 6,
              }}
            >
              Phase 5 Feature
            </Text>
            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 13,
                color: '#8A8F8C',
                lineHeight: 20,
              }}
            >
              Victory Native charts (handicap trend, SG radar, practice consistency) go live in Phase 5. Live data is already being collected below.
            </Text>
          </Card>

          {/* Handicap snapshot */}
          <SectionHeader title="Handicap" />
          <Card style={{ marginBottom: 20 }}>
            {latestHandicap ? (
              <>
                <StatRow
                  label="Current Index"
                  value={latestHandicap.handicap_index.toFixed(1)}
                  sub={latestHandicap.recorded_date}
                />
                {handicapHistory.length >= 2 && (
                  <StatRow
                    label="Change"
                    value={`${(latestHandicap.handicap_index - handicapHistory[handicapHistory.length - 1].handicap_index).toFixed(1)}`}
                    sub="vs first recorded"
                  />
                )}
              </>
            ) : (
              <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 13, color: '#4A4E4C', paddingVertical: 12 }}>
                No handicap history recorded yet.
              </Text>
            )}
          </Card>

          {/* Round stats */}
          <SectionHeader title="Scoring" subtitle={`Last ${recentRounds.length} rounds`} />
          <Card style={{ marginBottom: 20 }}>
            {recentRounds.length === 0 ? (
              <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 13, color: '#4A4E4C', paddingVertical: 12 }}>
                No rounds logged yet.
              </Text>
            ) : (
              <>
                <StatRow
                  label="Scoring Average"
                  value={avg(recentRounds.map((r) => r.gross_score)).toFixed(1)}
                  sub={`${recentRounds.length} rounds`}
                />
                <StatRow
                  label="Best Score"
                  value={String(Math.min(...recentRounds.map((r) => r.gross_score)))}
                />
                <StatRow
                  label="Avg Differential"
                  value={
                    recentRounds.some((r) => r.handicap_differential != null)
                      ? avg(recentRounds.filter((r) => r.handicap_differential != null).map((r) => r.handicap_differential!)).toFixed(1)
                      : '--'
                  }
                />
              </>
            )}
          </Card>

          {/* Strokes Gained averages */}
          {recentRounds.some((r) => r.sg_off_tee != null) && (
            <>
              <SectionHeader title="Strokes Gained Avg" subtitle="Last 10 rounds" />
              <Card style={{ marginBottom: 20 }}>
                <SGBar label="Off the Tee" value={recentRounds.some(r => r.sg_off_tee != null) ? avgSG.ott : null} />
                <SGBar label="Approach" value={recentRounds.some(r => r.sg_approach != null) ? avgSG.app : null} />
                <SGBar label="Around Green" value={recentRounds.some(r => r.sg_around_green != null) ? avgSG.arg : null} />
                <SGBar label="Putting" value={recentRounds.some(r => r.sg_putting != null) ? avgSG.put : null} />
              </Card>
            </>
          )}

          {/* Practice stats */}
          <SectionHeader title="Practice" subtitle={`Last ${sessions.length} sessions`} />
          <Card style={{ marginBottom: 20 }}>
            {sessions.length === 0 ? (
              <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 13, color: '#4A4E4C', paddingVertical: 12 }}>
                No sessions logged yet.
              </Text>
            ) : (
              <>
                <StatRow
                  label="Sessions Logged"
                  value={String(sessions.length)}
                />
                <StatRow
                  label="Avg Quality"
                  value={
                    sessions.some((s) => s.overall_quality != null)
                      ? avg(sessions.filter((s) => s.overall_quality != null).map((s) => s.overall_quality!)).toFixed(1)
                      : '--'
                  }
                  sub="out of 5"
                />
                {sequencePct !== null && (
                  <StatRow
                    label="Sequence Quality"
                    value={`${sequencePct}%`}
                    sub="blocks where sequence felt right"
                  />
                )}
              </>
            )}
          </Card>

          {/* Pressure Finish history */}
          {pressureBlocks.length > 0 && (
            <>
              <SectionHeader title="Pressure Finish" subtitle="Last 8 Tuesday results" />
              <Card style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {pressureBlocks.map((b, i) => (
                    <View
                      key={b.id}
                      style={{
                        borderWidth: 1,
                        borderColor: '#2A2E2C',
                        borderRadius: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        minWidth: 56,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'DMMono_500Medium',
                          fontSize: 14,
                          color: '#F0F2F0',
                        }}
                      >
                        {b.metric_result ?? '--'}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
