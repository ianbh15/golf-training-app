import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartesianChart, Line } from 'victory-native';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import type { Round, PracticeSession, SessionBlock, HandicapEntry } from '../../lib/types/database';

const CHART_H = 160;

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(
    ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function shortWeekLabel(key: string): string {
  // "2026-W17" → "W17"
  return key.split('-')[1] ?? key;
}

function parseFraction(str: string | null): number | null {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length !== 2) return null;
  const num = parseFloat(parts[0]);
  const den = parseFloat(parts[1]);
  if (isNaN(num) || isNaN(den) || den === 0) return null;
  return Math.round((num / den) * 100);
}

// ──────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#1A1D1B',
        borderWidth: 1,
        borderColor: '#2A2E2C',
        borderRadius: 4,
        padding: 12,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 22, color: '#4ADE80', marginBottom: 4 }}>
        {value}
      </Text>
      <Text
        style={{
          fontFamily: 'Outfit_400Regular',
          fontSize: 11,
          color: '#8A8F8C',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  empty,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <>
      <SectionHeader title={title} subtitle={subtitle} />
      <Card style={{ marginBottom: 20 }}>
        {empty ? (
          <Text
            style={{
              fontFamily: 'Outfit_400Regular',
              fontSize: 13,
              color: '#4A4E4C',
              paddingVertical: 20,
              textAlign: 'center',
            }}
          >
            {emptyMessage ?? 'Not enough data yet.'}
          </Text>
        ) : (
          children
        )}
      </Card>
    </>
  );
}

/** X-axis labels rendered as RN Text below a chart */
function XAxisLabels({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 2 }}>
      {labels.map((l, i) => (
        <Text
          key={i}
          style={{
            fontFamily: 'DMMono_400Regular',
            fontSize: 9,
            color: '#4A4E4C',
          }}
        >
          {l}
        </Text>
      ))}
    </View>
  );
}

/** Horizontal SG bar (existing design, kept consistent) */
function SGBar({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const color = value >= 0 ? '#4ADE80' : '#F59E0B';
  const maxAbs = 2;
  const barPct = Math.min(Math.abs(value) / maxAbs, 1) * 100;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 13, color: '#8A8F8C' }}>
          {label}
        </Text>
        <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 13, color }}>
          {value >= 0 ? '+' : ''}{value.toFixed(2)}
        </Text>
      </View>
      <View style={{ height: 4, backgroundColor: '#0D0F0E', borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: 4, width: `${barPct}%`, backgroundColor: color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

/** Vertical bar for practice consistency — per-bar color */
function ConsistencyBar({ sessions, label }: { sessions: number; label: string }) {
  const color =
    sessions >= 3 ? '#4ADE80' : sessions >= 1 ? '#F59E0B' : '#2A2E2C';
  const heightPct = sessions / 3;
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <View
        style={{
          width: '60%',
          height: 80,
          justifyContent: 'flex-end',
          backgroundColor: '#0D0F0E',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: '100%',
            height: `${Math.max(heightPct * 100, sessions > 0 ? 10 : 0)}%`,
            backgroundColor: color,
            borderRadius: 2,
          }}
        />
      </View>
      <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 9, color: '#4A4E4C' }}>
        {label}
      </Text>
      <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 11, color }}>
        {sessions}/3
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// Screen
// ──────────────────────────────────────────────────────────

export default function StatsScreen() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [blocks, setBlocks] = useState<SessionBlock[]>([]);
  const [handicapHistory, setHandicapHistory] = useState<HandicapEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async (uid: string) => {
    const [r, s, h] = await Promise.all([
      supabase
        .from('rounds')
        .select('*')
        .eq('user_id', uid)
        .order('played_date', { ascending: false })
        .limit(20),
      supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', uid)
        .order('session_date', { ascending: false })
        .limit(24),
      supabase
        .from('handicap_history')
        .select('*')
        .eq('user_id', uid)
        .order('recorded_date', { ascending: false })
        .limit(20),
    ]);

    const sessionList = s.data ?? [];
    setRounds(r.data ?? []);
    setSessions(sessionList);
    setHandicapHistory(h.data ?? []);

    // Fetch blocks for all sessions
    if (sessionList.length > 0) {
      const { data: bData } = await supabase
        .from('session_blocks')
        .select('*')
        .in('session_id', sessionList.map((sess) => sess.id));
      setBlocks(bData ?? []);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) await fetchAll(data.user.id);
      setLoading(false);
    });
  }, []);

  // ── Computed values ──────────────────────────────────────

  const recentRounds = rounds.slice(0, 10);
  const latestHandicap = handicapHistory[0] ?? null;

  // Sessions this month
  const thisMonth = new Date().toISOString().slice(0, 7);
  const sessionsThisMonth = sessions.filter((s) =>
    s.session_date.startsWith(thisMonth)
  ).length;

  // SG averages (last 10 rounds)
  const sgRounds = recentRounds.filter(
    (r) => r.sg_off_tee != null || r.sg_approach != null
  );
  const avgSG = {
    ott: sgRounds.some((r) => r.sg_off_tee != null)
      ? avg(sgRounds.filter((r) => r.sg_off_tee != null).map((r) => r.sg_off_tee!))
      : null,
    app: sgRounds.some((r) => r.sg_approach != null)
      ? avg(sgRounds.filter((r) => r.sg_approach != null).map((r) => r.sg_approach!))
      : null,
    arg: sgRounds.some((r) => r.sg_around_green != null)
      ? avg(sgRounds.filter((r) => r.sg_around_green != null).map((r) => r.sg_around_green!))
      : null,
    put: sgRounds.some((r) => r.sg_putting != null)
      ? avg(sgRounds.filter((r) => r.sg_putting != null).map((r) => r.sg_putting!))
      : null,
  };
  const hasSGData = Object.values(avgSG).some((v) => v !== null);

  // 5a. Handicap trend data (last 10, ascending)
  const handicapChartData = handicapHistory
    .slice(0, 10)
    .reverse()
    .map((h, i) => ({ x: i, y: Number(h.handicap_index) }));
  const handicapLabels = handicapHistory
    .slice(0, 10)
    .reverse()
    .map((h) => h.recorded_date.slice(5)); // "MM-DD"

  // 5c. Practice consistency (last 8 weeks)
  const weekMap = new Map<string, number>();
  sessions.forEach((s) => {
    const key = isoWeekKey(s.session_date);
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
  });
  const sortedWeeks = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8);
  const consistencyData = sortedWeeks.map(([key, count]) => ({
    label: shortWeekLabel(key),
    sessions: Math.min(count, 3),
  }));

  // 5d. Pressure Finish Trend (last 8 Tuesday sessions with the block)
  const tuesdaySessions = sessions
    .filter((s) => s.day_type === 'tuesday')
    .slice(0, 8)
    .reverse();

  const pressureData = tuesdaySessions
    .map((s, i) => {
      const block = blocks.find(
        (b) => b.session_id === s.id && b.block_key === 'tuesday_pressure_finish'
      );
      const pct = parseFraction(block?.metric_result ?? null);
      return { x: i, y: pct ?? 0, date: s.session_date.slice(5) };
    });
  const pressureLabels = pressureData.map((d) => d.date);
  const hasPressureData = tuesdaySessions.length >= 3;

  // 5e. Sequence Quality Trend (last 8 sessions)
  const sequenceData = sessions
    .slice(0, 8)
    .reverse()
    .map((s, i) => {
      const sBlocks = blocks.filter(
        (b) => b.session_id === s.id && b.sequence_felt_right !== null
      );
      if (!sBlocks.length) return { x: i, y: 0, date: s.session_date.slice(5) };
      const pct = Math.round(
        (sBlocks.filter((b) => b.sequence_felt_right).length / sBlocks.length) * 100
      );
      return { x: i, y: pct, date: s.session_date.slice(5) };
    });
  const sequenceLabels = sequenceData.map((d) => d.date);
  const hasSequenceData =
    sessions.length >= 2 &&
    blocks.some((b) => b.sequence_felt_right !== null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0F0E' }}>
      {/* Header */}
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

          {/* ── Summary Row ── */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
            <StatBox label="Rounds Logged" value={String(rounds.length)} />
            <StatBox label="Sessions This Month" value={String(sessionsThisMonth)} />
            <StatBox
              label="Current Index"
              value={latestHandicap ? latestHandicap.handicap_index.toFixed(1) : '--'}
            />
          </View>

          {/* ── 5a. Handicap Trend ── */}
          <ChartCard
            title="Handicap Trend"
            subtitle="Index over time (lower = better)"
            empty={handicapChartData.length < 2}
            emptyMessage="Log at least 2 handicap entries to see the trend."
          >
            <View style={{ height: CHART_H }}>
              <CartesianChart
                data={handicapChartData}
                xKey="x"
                yKeys={['y']}
                domainPadding={{ top: 12, bottom: 12 }}
                axisOptions={{
                  font: null,
                  lineColor: '#2A2E2C',
                  labelColor: '#4A4E4C',
                }}
              >
                {({ points }) => (
                  <Line
                    points={points.y}
                    color="#4ADE80"
                    strokeWidth={2}
                  />
                )}
              </CartesianChart>
            </View>
            <XAxisLabels labels={handicapLabels} />
          </ChartCard>

          {/* ── 5b. Strokes Gained Comparison ── */}
          {hasSGData && (
            <ChartCard
              title="Strokes Gained"
              subtitle={`Avg last ${sgRounds.length} rounds · positive = better than scratch`}
            >
              <View style={{ paddingTop: 4 }}>
                <SGBar label="Off the Tee" value={avgSG.ott} />
                <SGBar label="Approach" value={avgSG.app} />
                <SGBar label="Around Green" value={avgSG.arg} />
                <SGBar label="Putting" value={avgSG.put} />
              </View>
            </ChartCard>
          )}

          {/* ── 5c. Practice Consistency ── */}
          <ChartCard
            title="Practice Consistency"
            subtitle="Sessions per week (max 3)"
            empty={consistencyData.length === 0}
            emptyMessage="No sessions logged yet."
          >
            <View style={{ flexDirection: 'row', gap: 4, paddingTop: 8 }}>
              {consistencyData.map((d) => (
                <ConsistencyBar key={d.label} sessions={d.sessions} label={d.label} />
              ))}
            </View>
          </ChartCard>

          {/* ── 5d. Pressure Finish Trend ── */}
          <ChartCard
            title="Pressure Finish"
            subtitle="Targets hit % · last 8 Tuesday sessions"
            empty={!hasPressureData}
            emptyMessage="Complete at least 3 Tuesday sessions to see this chart."
          >
            <View style={{ height: CHART_H }}>
              <CartesianChart
                data={pressureData}
                xKey="x"
                yKeys={['y']}
                domain={{ y: [0, 100] }}
                domainPadding={{ top: 10, bottom: 10 }}
                axisOptions={{
                  font: null,
                  lineColor: '#2A2E2C',
                  labelColor: '#4A4E4C',
                }}
              >
                {({ points }) => (
                  <Line
                    points={points.y}
                    color="#4ADE80"
                    strokeWidth={2}
                  />
                )}
              </CartesianChart>
            </View>
            <XAxisLabels labels={pressureLabels} />
          </ChartCard>

          {/* ── 5e. Sequence Quality Trend ── */}
          <ChartCard
            title="Sequence Quality %"
            subtitle="% swing-key blocks where sequence felt right"
            empty={!hasSequenceData}
            emptyMessage="Complete at least 2 sessions with sequence tracking to see this chart."
          >
            <View style={{ height: CHART_H }}>
              <CartesianChart
                data={sequenceData}
                xKey="x"
                yKeys={['y']}
                domain={{ y: [0, 100] }}
                domainPadding={{ top: 10, bottom: 10 }}
                axisOptions={{
                  font: null,
                  lineColor: '#2A2E2C',
                  labelColor: '#4A4E4C',
                }}
              >
                {({ points }) => (
                  <Line
                    points={points.y}
                    color="#4ADE80"
                    strokeWidth={2}
                  />
                )}
              </CartesianChart>
            </View>
            <XAxisLabels labels={sequenceLabels} />
          </ChartCard>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
