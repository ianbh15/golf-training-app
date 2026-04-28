import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { generateInsight } from '../../lib/claude';
import {
  buildWeeklySummaryContext,
  generateAndSaveInsight,
} from '../../lib/aiHelpers';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { notifyWeeklySummaryReady } from '../../lib/notifications';
import type { AiInsight } from '../../lib/types/database';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const TYPE_LABELS: Record<string, string> = {
  weekly_summary: 'Weekly',
  pre_session: 'Pre-Session',
  round_debrief: 'Round Debrief',
};

const TYPE_COLORS: Record<string, string> = {
  weekly_summary: '#4ADE80',
  pre_session: '#4ADE80',
  round_debrief: '#F59E0B',
};

// ──────────────────────────────────────────────────────────
// TypeBadge
// ──────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: TYPE_COLORS[type] ?? '#4A4E4C',
      }}
    >
      <Text
        style={{
          fontFamily: 'DMMono_400Regular',
          fontSize: 9,
          color: TYPE_COLORS[type] ?? '#4A4E4C',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {TYPE_LABELS[type] ?? type}
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// Screen
// ──────────────────────────────────────────────────────────

export default function CoachScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Insights split by type
  const [weeklyInsight, setWeeklyInsight] = useState<AiInsight | null>(null);
  const [lastRoundDebrief, setLastRoundDebrief] = useState<AiInsight | null>(null);
  const [allInsights, setAllInsights] = useState<AiInsight[]>([]);

  // UI state
  const [generatingWeekly, setGeneratingWeekly] = useState(false);
  const [roundDebriefExpanded, setRoundDebriefExpanded] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatQuestion, setChatQuestion] = useState<string | null>(null);
  const [chatResponse, setChatResponse] = useState<string | null>(null);

  const loadInsights = async (uid: string) => {
    const { data } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', uid)
      .order('generated_at', { ascending: false })
      .limit(30);

    if (!data) return;

    setAllInsights(data);
    setWeeklyInsight(data.find((i) => i.insight_type === 'weekly_summary') ?? null);
    setLastRoundDebrief(data.find((i) => i.insight_type === 'round_debrief') ?? null);
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        await loadInsights(data.user.id);
      }
      setLoading(false);
    });
  }, []);

  // ── Generate weekly summary ──
  const handleGenerateWeekly = async () => {
    if (!userId || generatingWeekly) return;
    setGeneratingWeekly(true);
    try {
      const context = await buildWeeklySummaryContext(userId);
      const insight = await generateAndSaveInsight(userId, 'weekly_summary', context);
      if (insight) {
        setWeeklyInsight(insight);
        setAllInsights((prev) => [insight, ...prev]);
        notifyWeeklySummaryReady().catch(() => {});
      }
    } finally {
      setGeneratingWeekly(false);
    }
  };

  // ── Chat ──
  const handleChat = async () => {
    if (!userId || !chatInput.trim() || chatLoading) return;

    const question = chatInput.trim();
    setChatInput('');
    setChatQuestion(question);
    setChatResponse(null);
    setChatLoading(true);

    try {
      // Build context: last 4 rounds + last 3 sessions
      const [roundsRes, sessionsRes] = await Promise.all([
        supabase
          .from('rounds')
          .select('*')
          .eq('user_id', userId)
          .order('played_date', { ascending: false })
          .limit(4),
        supabase
          .from('practice_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('session_date', { ascending: false })
          .limit(3),
      ]);

      const context = {
        last_4_rounds: roundsRes.data ?? [],
        last_3_sessions: sessionsRes.data ?? [],
      };

      const userMessage = `Context:\n${JSON.stringify(context, null, 2)}\n\nQuestion: ${question}`;
      const response = await generateInsight('chat', context, userMessage);
      setChatResponse(response || 'Coach unavailable — try again.');
    } catch {
      setChatResponse('Coach unavailable — check your connection.');
    } finally {
      setChatLoading(false);
    }
  };

  // History insights (exclude the featured weekly + last round debrief)
  const historyInsights = allInsights.filter(
    (i) =>
      i.id !== weeklyInsight?.id && i.id !== lastRoundDebrief?.id
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0F0E' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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
            Intelligence Layer
          </Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#F0F2F0' }}>
            GoLo Coach
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <ActivityIndicator color="#4ADE80" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* ── 1. Weekly Debrief ── */}
              <SectionHeader title="Weekly Debrief" />
              <Card style={{ marginBottom: 20 }}>
                {weeklyInsight ? (
                  <>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'DMMono_400Regular',
                          fontSize: 10,
                          color: '#4A4E4C',
                        }}
                      >
                        {formatDateTime(weeklyInsight.generated_at)}
                      </Text>
                      <TouchableOpacity
                        onPress={handleGenerateWeekly}
                        disabled={generatingWeekly}
                        style={{ opacity: generatingWeekly ? 0.5 : 1 }}
                        accessibilityLabel="Regenerate weekly summary"
                      >
                        {generatingWeekly ? (
                          <ActivityIndicator color="#4ADE80" size="small" />
                        ) : (
                          <Text
                            style={{
                              fontFamily: 'DMMono_500Medium',
                              fontSize: 10,
                              color: '#4ADE80',
                              textTransform: 'uppercase',
                              letterSpacing: 1,
                            }}
                          >
                            Refresh ↺
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    <Text
                      style={{
                        fontFamily: 'Outfit_400Regular',
                        fontSize: 14,
                        color: '#F0F2F0',
                        lineHeight: 22,
                      }}
                    >
                      {weeklyInsight.content}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      style={{
                        fontFamily: 'Outfit_400Regular',
                        fontSize: 13,
                        color: '#8A8F8C',
                        marginBottom: 16,
                        lineHeight: 20,
                      }}
                    >
                      Get a data-driven breakdown of your biggest scoring leaks and specific practice
                      adjustments for next week.
                    </Text>
                    <TouchableOpacity
                      onPress={handleGenerateWeekly}
                      disabled={generatingWeekly}
                      accessibilityLabel="Generate weekly summary"
                      style={{
                        height: 46,
                        borderWidth: 1,
                        borderColor: '#4ADE80',
                        borderRadius: 4,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: generatingWeekly ? 0.6 : 1,
                      }}
                    >
                      {generatingWeekly ? (
                        <ActivityIndicator color="#4ADE80" size="small" />
                      ) : (
                        <Text
                          style={{
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 13,
                            color: '#4ADE80',
                            letterSpacing: 1,
                          }}
                        >
                          GENERATE THIS WEEK{"'"}S SUMMARY
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </Card>

              {/* ── 2. Last Round Debrief ── */}
              {lastRoundDebrief && (
                <>
                  <SectionHeader title="Last Round Debrief" />
                  <TouchableOpacity
                    onPress={() => setRoundDebriefExpanded((v) => !v)}
                    activeOpacity={0.85}
                  >
                    <Card style={{ marginBottom: 20 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: roundDebriefExpanded ? 12 : 0,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'DMMono_400Regular',
                            fontSize: 10,
                            color: '#4A4E4C',
                          }}
                        >
                          {formatDate(lastRoundDebrief.generated_at)}
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'DMMono_400Regular',
                            fontSize: 11,
                            color: '#4A4E4C',
                          }}
                        >
                          {roundDebriefExpanded ? '▲' : '▼'}
                        </Text>
                      </View>
                      {!roundDebriefExpanded && (
                        <Text
                          style={{
                            fontFamily: 'Outfit_400Regular',
                            fontSize: 13,
                            color: '#8A8F8C',
                            lineHeight: 20,
                          }}
                          numberOfLines={2}
                        >
                          {lastRoundDebrief.content}
                        </Text>
                      )}
                      {roundDebriefExpanded && (
                        <Text
                          style={{
                            fontFamily: 'Outfit_400Regular',
                            fontSize: 14,
                            color: '#F0F2F0',
                            lineHeight: 22,
                          }}
                        >
                          {lastRoundDebrief.content}
                        </Text>
                      )}
                    </Card>
                  </TouchableOpacity>
                </>
              )}

              {/* ── 3. Ask the Coach ── */}
              <SectionHeader title="Ask the Coach" />
              <Card style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: chatQuestion ? 16 : 0 }}>
                  <TextInput
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder="Ask anything about your game…"
                    placeholderTextColor="#4A4E4C"
                    returnKeyType="send"
                    onSubmitEditing={handleChat}
                    style={{
                      flex: 1,
                      height: 44,
                      backgroundColor: '#0D0F0E',
                      borderWidth: 1,
                      borderColor: '#2A2E2C',
                      borderRadius: 4,
                      paddingHorizontal: 14,
                      fontFamily: 'Outfit_400Regular',
                      fontSize: 14,
                      color: '#F0F2F0',
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleChat}
                    disabled={chatLoading || !chatInput.trim()}
                    accessibilityLabel="Send message to coach"
                    style={{
                      width: 44,
                      height: 44,
                      borderWidth: 1,
                      borderColor: chatInput.trim() ? '#4ADE80' : '#2A2E2C',
                      borderRadius: 4,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: chatLoading ? 0.6 : 1,
                    }}
                  >
                    {chatLoading ? (
                      <ActivityIndicator color="#4ADE80" size="small" />
                    ) : (
                      <Text
                        style={{
                          fontFamily: 'DMMono_500Medium',
                          fontSize: 18,
                          color: chatInput.trim() ? '#4ADE80' : '#4A4E4C',
                        }}
                      >
                        ↑
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Q&A display */}
                {chatQuestion && (
                  <View>
                    <View
                      style={{
                        backgroundColor: '#0D0F0E',
                        borderRadius: 4,
                        padding: 12,
                        marginBottom: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'DMMono_500Medium',
                          fontSize: 10,
                          color: '#4A4E4C',
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                          marginBottom: 4,
                        }}
                      >
                        You
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Outfit_400Regular',
                          fontSize: 13,
                          color: '#8A8F8C',
                        }}
                      >
                        {chatQuestion}
                      </Text>
                    </View>

                    {chatLoading ? (
                      <View style={{ paddingVertical: 12, alignItems: 'flex-start' }}>
                        <ActivityIndicator color="#4ADE80" size="small" />
                      </View>
                    ) : chatResponse ? (
                      <View>
                        <Text
                          style={{
                            fontFamily: 'DMMono_500Medium',
                            fontSize: 10,
                            color: '#4ADE80',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            marginBottom: 6,
                            opacity: 0.7,
                          }}
                        >
                          Coach
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'Outfit_400Regular',
                            fontSize: 14,
                            color: '#F0F2F0',
                            lineHeight: 22,
                          }}
                        >
                          {chatResponse}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </Card>

              {/* ── 4. Insight History ── */}
              {historyInsights.length > 0 && (
                <>
                  <SectionHeader title="Insight History" />
                  {historyInsights.map((insight) => (
                    <TouchableOpacity
                      key={insight.id}
                      onPress={() =>
                        setExpandedHistoryId((id) =>
                          id === insight.id ? null : insight.id
                        )
                      }
                      activeOpacity={0.85}
                    >
                      <Card style={{ marginBottom: 10 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                          }}
                        >
                          <TypeBadge type={insight.insight_type} />
                          <Text
                            style={{
                              fontFamily: 'DMMono_400Regular',
                              fontSize: 10,
                              color: '#4A4E4C',
                            }}
                          >
                            {formatDate(insight.generated_at)}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontFamily: 'Outfit_400Regular',
                            fontSize: 13,
                            color: expandedHistoryId === insight.id ? '#F0F2F0' : '#8A8F8C',
                            lineHeight: 20,
                          }}
                          numberOfLines={expandedHistoryId === insight.id ? undefined : 2}
                        >
                          {insight.content}
                        </Text>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {allInsights.length === 0 && (
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
                    No insights yet.{'\n'}Generate a weekly summary or log a round to get started.
                  </Text>
                </Card>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
