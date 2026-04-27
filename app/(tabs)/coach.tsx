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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import type { AiInsight } from '../../lib/types/database';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function insightTypeLabel(t: string): string {
  return { weekly_summary: 'Weekly Summary', pre_session: 'Pre-Session', round_debrief: 'Round Debrief' }[t] ?? t;
}

export default function CoachScreen() {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchInsights = async (uid: string) => {
    const { data } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', uid)
      .order('generated_at', { ascending: false })
      .limit(20);
    if (data) setInsights(data);
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        await fetchInsights(data.user.id);
      }
      setLoading(false);
    });
  }, []);

  const handleGenerateWeekly = async () => {
    if (!userId) return;
    setGenerating(true);

    try {
      // Fetch context data
      const [roundsRes, sessionsRes] = await Promise.all([
        supabase.from('rounds').select('*').eq('user_id', userId).order('played_date', { ascending: false }).limit(4),
        supabase.from('practice_sessions').select('*').eq('user_id', userId).order('session_date', { ascending: false }).limit(3),
      ]);

      const context = {
        last_4_rounds: roundsRes.data ?? [],
        last_3_sessions: sessionsRes.data ?? [],
        question: "Analyze this data. Identify the 1-2 biggest scoring leaks and recommend specific practice adjustments for next week. Reference session blocks and metrics. Be direct — this is a 3-handicap golfer who doesn't need fundamentals explained.",
      };

      // Call via Supabase Edge Function (Phase 4) — stub for now
      Alert.alert(
        'Coming in Phase 4',
        'Weekly summary generation will be connected to the Claude API in Phase 4. Context is ready:\n\n' +
        `${(roundsRes.data ?? []).length} rounds, ${(sessionsRes.data ?? []).length} sessions collected.`
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to generate insight.');
    } finally {
      setGenerating(false);
    }
  };

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
            AI Coach
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Generate Weekly Debrief */}
          <TouchableOpacity
            onPress={handleGenerateWeekly}
            disabled={generating}
            accessibilityLabel="Generate weekly summary"
            style={{
              height: 46,
              borderWidth: 1,
              borderColor: '#4ADE80',
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? (
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
                GENERATE WEEKLY DEBRIEF
              </Text>
            )}
          </TouchableOpacity>

          {/* Phase 4 notice */}
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
              Phase 4 Feature
            </Text>
            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 13,
                color: '#8A8F8C',
                lineHeight: 20,
              }}
            >
              Claude AI integration goes live in Phase 4. Data collection (sessions, rounds, blocks) is fully active now. Once your API key is connected via Supabase Edge Functions, insights will appear here automatically after each round and weekly.
            </Text>
          </Card>

          {/* Insights history */}
          <SectionHeader title="Insight History" />

          {loading ? (
            <ActivityIndicator color="#4ADE80" style={{ marginTop: 40 }} />
          ) : insights.length === 0 ? (
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
                No insights yet.{'\n'}Insights are generated after rounds and sessions.
              </Text>
            </Card>
          ) : (
            insights.map((insight) => (
              <TouchableOpacity
                key={insight.id}
                onPress={() => setExpandedId((id) => (id === insight.id ? null : insight.id))}
                activeOpacity={0.85}
              >
                <Card style={{ marginBottom: 10 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMMono_500Medium',
                        fontSize: 10,
                        color: '#4ADE80',
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                      }}
                    >
                      {insightTypeLabel(insight.insight_type)}
                    </Text>
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
                      fontSize: 14,
                      color: '#F0F2F0',
                      lineHeight: 22,
                    }}
                    numberOfLines={expandedId === insight.id ? undefined : 4}
                  >
                    {insight.content}
                  </Text>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Chat input — Phase 4 */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#0D0F0E',
            borderTopWidth: 1,
            borderTopColor: '#2A2E2C',
            padding: 12,
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <TextInput
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Ask the coach... (Phase 4)"
            placeholderTextColor="#4A4E4C"
            style={{
              flex: 1,
              height: 44,
              backgroundColor: '#1A1D1B',
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
            style={{
              width: 44,
              height: 44,
              backgroundColor: '#1A1D1B',
              borderWidth: 1,
              borderColor: '#2A2E2C',
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => Alert.alert('Phase 4', 'Chat coming in Phase 4.')}
            accessibilityLabel="Send message to AI coach"
          >
            <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 18, color: '#4A4E4C' }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
