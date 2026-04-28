import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useRoundStore } from '../../../lib/store/roundStore';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { QualityRating } from '../../../components/ui/QualityRating';
import { Card } from '../../../components/ui/Card';
import {
  buildRoundDebriefContext,
  generateAndSaveInsight,
} from '../../../lib/aiHelpers';
import type { Round } from '../../../lib/types/database';

// ── Shared styles ──
const labelStyle = {
  fontFamily: 'Outfit_400Regular' as const,
  fontSize: 12,
  color: '#8A8F8C',
  marginBottom: 6,
  textTransform: 'uppercase' as const,
  letterSpacing: 1,
};

const inputStyle = {
  backgroundColor: '#1A1D1B',
  borderWidth: 1,
  borderColor: '#2A2E2C',
  borderRadius: 4,
  height: 46,
  paddingHorizontal: 14,
  fontFamily: 'Outfit_400Regular' as const,
  fontSize: 15,
  color: '#F0F2F0',
};

const rowStyle = { marginBottom: 16 };

function SGInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={labelStyle}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numbers-and-punctuation"
        placeholder="+0.00"
        placeholderTextColor="#4A4E4C"
        style={inputStyle}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// Inline debrief view shown after a round is saved
// ──────────────────────────────────────────────────────────

function DebriefView({
  round,
  debrief,
  loading,
  onDone,
}: {
  round: Round;
  debrief: string | null;
  loading: boolean;
  onDone: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      {/* Confirmation */}
      <View style={{ alignItems: 'center', marginBottom: 28, marginTop: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#14532D',
            borderWidth: 1,
            borderColor: '#4ADE80',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 22, color: '#4ADE80' }}>✓</Text>
        </View>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: '#F0F2F0', marginBottom: 4 }}>
          Round Saved
        </Text>
        <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: '#8A8F8C' }}>
          {round.course_name} · {round.gross_score}
        </Text>
      </View>

      {/* AI Debrief */}
      <Card style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 10,
              color: '#4ADE80',
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            Coach · Round Debrief
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 24, alignItems: 'center', gap: 12 }}>
            <ActivityIndicator color="#4ADE80" />
            <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 13, color: '#4A4E4C' }}>
              Analysing your round…
            </Text>
          </View>
        ) : debrief ? (
          <Text
            style={{
              fontFamily: 'Outfit_400Regular',
              fontSize: 14,
              color: '#F0F2F0',
              lineHeight: 22,
            }}
          >
            {debrief}
          </Text>
        ) : (
          <Text
            style={{
              fontFamily: 'Outfit_400Regular',
              fontSize: 14,
              color: '#4A4E4C',
              lineHeight: 22,
            }}
          >
            Coach unavailable — check your API key and connection.
          </Text>
        )}
      </Card>

      <TouchableOpacity
        onPress={onDone}
        accessibilityLabel="Done"
        style={{
          height: 50,
          backgroundColor: '#1A1D1B',
          borderWidth: 1,
          borderColor: '#2A2E2C',
          borderRadius: 4,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'Outfit_700Bold',
            fontSize: 14,
            color: '#8A8F8C',
            letterSpacing: 1,
          }}
        >
          DONE
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Screen ──
export default function LogRoundScreen() {
  const { draft, updateDraft, saveRound, isSaving, error, recentCourses, fetchRounds } =
    useRoundStore();
  const [userId, setUserId] = useState<string | null>(null);
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(false);

  // Post-save state
  const [savedRound, setSavedRound] = useState<Round | null>(null);
  const [debrief, setDebrief] = useState<string | null>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchRounds(data.user.id);
      }
    });
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    if (!draft.courseName.trim()) {
      Alert.alert('Required', 'Course name is required.');
      return;
    }
    if (!draft.grossScore.trim()) {
      Alert.alert('Required', 'Gross score is required.');
      return;
    }

    const id = await saveRound(userId);
    if (!id) return; // error shown via store.error

    // Fetch the saved round to build debrief context
    const { data: round } = await supabase
      .from('rounds')
      .select('*')
      .eq('id', id)
      .single();

    if (!round) return;

    setSavedRound(round);
    setDebriefLoading(true);

    // Generate debrief in background — never crash
    try {
      const context = await buildRoundDebriefContext(userId, round);
      const insight = await generateAndSaveInsight(userId, 'round_debrief', context);
      setDebrief(insight?.content ?? null);
    } catch {
      setDebrief(null);
    } finally {
      setDebriefLoading(false);
    }
  };

  const filteredCourses = recentCourses.filter((c) =>
    c.toLowerCase().includes(draft.courseName.toLowerCase())
  );

  // ── Post-save view ──
  if (savedRound) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0F0E' }}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#2A2E2C',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: '#F0F2F0' }}>
            Round Debrief
          </Text>
        </View>
        <DebriefView
          round={savedRound}
          debrief={debrief}
          loading={debriefLoading}
          onDone={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  // ── Form view ──
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
            paddingTop: 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#2A2E2C',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Cancel">
            <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: '#8A8F8C' }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: '#F0F2F0' }}>
            Log Round
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} accessibilityLabel="Save round">
            {isSaving ? (
              <ActivityIndicator color="#4ADE80" size="small" />
            ) : (
              <Text
                style={{
                  fontFamily: 'Outfit_700Bold',
                  fontSize: 14,
                  color: '#4ADE80',
                  letterSpacing: 0.5,
                }}
              >
                SAVE
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Core Fields ── */}
          <SectionHeader title="Round" />

          {/* Course name with autocomplete */}
          <View style={rowStyle}>
            <Text style={labelStyle}>Course Name</Text>
            <TextInput
              value={draft.courseName}
              onChangeText={(t) => {
                updateDraft({ courseName: t });
                setShowCourseSuggestions(t.length > 0 && recentCourses.length > 0);
              }}
              onBlur={() => setTimeout(() => setShowCourseSuggestions(false), 150)}
              placeholder="Augusta National..."
              placeholderTextColor="#4A4E4C"
              style={inputStyle}
            />
            {showCourseSuggestions && filteredCourses.length > 0 && (
              <View
                style={{
                  backgroundColor: '#1A1D1B',
                  borderWidth: 1,
                  borderColor: '#2A2E2C',
                  borderRadius: 4,
                  marginTop: 2,
                }}
              >
                {filteredCourses.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => {
                      updateDraft({ courseName: c });
                      setShowCourseSuggestions(false);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#2A2E2C',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Outfit_400Regular',
                        fontSize: 14,
                        color: '#F0F2F0',
                      }}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Date */}
          <View style={rowStyle}>
            <Text style={labelStyle}>Date Played</Text>
            <TextInput
              value={draft.playedDate}
              onChangeText={(t) => updateDraft({ playedDate: t })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#4A4E4C"
              style={inputStyle}
            />
          </View>

          {/* Score row */}
          <View style={[rowStyle, { flexDirection: 'row', gap: 12 }]}>
            <View style={{ flex: 2 }}>
              <Text style={labelStyle}>Gross Score</Text>
              <TextInput
                value={draft.grossScore}
                onChangeText={(t) => updateDraft({ grossScore: t })}
                keyboardType="number-pad"
                placeholder="72"
                placeholderTextColor="#4A4E4C"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Rating</Text>
              <TextInput
                value={draft.courseRating}
                onChangeText={(t) => updateDraft({ courseRating: t })}
                keyboardType="decimal-pad"
                placeholder="72.1"
                placeholderTextColor="#4A4E4C"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Slope</Text>
              <TextInput
                value={draft.slope}
                onChangeText={(t) => updateDraft({ slope: t })}
                keyboardType="number-pad"
                placeholder="113"
                placeholderTextColor="#4A4E4C"
                style={inputStyle}
              />
            </View>
          </View>

          {/* ── Strokes Gained ── */}
          <SectionHeader
            title="Strokes Gained"
            subtitle="Positive = better than scratch. Leave blank if unknown."
          />

          <View style={[rowStyle, { flexDirection: 'row', gap: 10 }]}>
            <SGInput
              label="Off Tee"
              value={draft.sgOffTee}
              onChange={(t) => updateDraft({ sgOffTee: t })}
            />
            <SGInput
              label="Approach"
              value={draft.sgApproach}
              onChange={(t) => updateDraft({ sgApproach: t })}
            />
          </View>
          <View style={[rowStyle, { flexDirection: 'row', gap: 10 }]}>
            <SGInput
              label="Around Green"
              value={draft.sgAroundGreen}
              onChange={(t) => updateDraft({ sgAroundGreen: t })}
            />
            <SGInput
              label="Putting"
              value={draft.sgPutting}
              onChange={(t) => updateDraft({ sgPutting: t })}
            />
          </View>

          {/* ── Qualitative ── */}
          <SectionHeader title="Debrief" />

          <View style={rowStyle}>
            <Text style={labelStyle}>Key Moment</Text>
            <TextInput
              value={draft.keyMoment}
              onChangeText={(t) => updateDraft({ keyMoment: t })}
              placeholder="Where was the round won or lost?"
              placeholderTextColor="#4A4E4C"
              multiline
              numberOfLines={3}
              style={[inputStyle, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
            />
          </View>

          <View style={rowStyle}>
            <QualityRating
              value={draft.mentalState}
              onChange={(v) => updateDraft({ mentalState: v })}
              label="Mental State  (1=Off · 3=Solid · 5=Locked In)"
            />
          </View>

          <View style={rowStyle}>
            <Text style={labelStyle}>Conditions</Text>
            <TextInput
              value={draft.conditions}
              onChangeText={(t) => updateDraft({ conditions: t })}
              placeholder="Wind, pressure, temperature..."
              placeholderTextColor="#4A4E4C"
              style={inputStyle}
            />
          </View>

          {/* Error */}
          {error && (
            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 13,
                color: '#EF4444',
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              {error}
            </Text>
          )}

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            accessibilityLabel="Save round to database"
            style={{
              height: 50,
              backgroundColor: '#4ADE80',
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isSaving ? 0.7 : 1,
              marginTop: 8,
            }}
          >
            {isSaving ? (
              <ActivityIndicator color="#0D0F0E" />
            ) : (
              <Text
                style={{
                  fontFamily: 'Outfit_700Bold',
                  fontSize: 15,
                  color: '#0D0F0E',
                  letterSpacing: 1,
                }}
              >
                SAVE ROUND
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
