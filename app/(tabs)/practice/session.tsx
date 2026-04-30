import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useSessionStore } from '../../../lib/store/sessionStore';
import { getRoutineForDay, ROUTINE } from '../../../constants/routine';
import type { BlockType, DayRoutine } from '../../../constants/routine';
import { Card } from '../../../components/ui/Card';
import { QualityRating } from '../../../components/ui/QualityRating';
import { MetricBadge } from '../../../components/ui/MetricBadge';
import { SequenceToggle } from '../../../components/ui/SequenceToggle';
import { SectionHeader } from '../../../components/ui/SectionHeader';

// ──────────────────────────────────────────────────────────
// Metric Input
// ──────────────────────────────────────────────────────────

function MetricInput({
  block,
  value,
  onChange,
}: {
  block: BlockType;
  value: string | null;
  onChange: (v: string) => void;
}) {
  if (!block.metric) return null;
  const { metric } = block;

  if (metric.inputType === 'fraction') {
    // Parse "X/Y" or just allow free text for numerator
    const parts = (value ?? '').split('/');
    const hits = parts[0] ?? '';
    const total = metric.denominator ?? 0;

    return (
      <View style={{ marginVertical: 8 }}>
        <Text style={labelStyle}>{metric.label} · target: {metric.target}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            value={hits}
            onChangeText={(t) => onChange(`${t}/${total}`)}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="0"
            placeholderTextColor="#4A4E4C"
            style={[inputStyle, { width: 56, textAlign: 'center' }]}
          />
          <Text style={{ fontFamily: 'DMMono_400Regular', color: '#8A8F8C', fontSize: 16 }}>
            / {total}
          </Text>
        </View>
      </View>
    );
  }

  if (metric.inputType === 'boolean') {
    const isDone = value === 'true';
    return (
      <View style={{ marginVertical: 8 }}>
        <Text style={labelStyle}>{metric.label} · target: {metric.target}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['true', 'false'].map((opt) => (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              style={{
                flex: 1,
                height: 38,
                borderWidth: 1,
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: value === opt ? (opt === 'true' ? '#4ADE80' : '#F59E0B') : '#2A2E2C',
                backgroundColor:
                  value === opt
                    ? opt === 'true'
                      ? 'rgba(74,222,128,0.12)'
                      : 'rgba(245,158,11,0.12)'
                    : '#1A1D1B',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Outfit_600SemiBold',
                  fontSize: 13,
                  color: value === opt ? (opt === 'true' ? '#4ADE80' : '#F59E0B') : '#8A8F8C',
                }}
              >
                {opt === 'true' ? 'DONE' : 'NOT YET'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // text
  return (
    <View style={{ marginVertical: 8 }}>
      <Text style={labelStyle}>{metric.label} · target: {metric.target}</Text>
      <TextInput
        value={value ?? ''}
        onChangeText={onChange}
        placeholder="Enter result..."
        placeholderTextColor="#4A4E4C"
        style={inputStyle}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// Block Card
// ──────────────────────────────────────────────────────────

function BlockCard({
  block,
  isExpanded,
  onToggleExpand,
}: {
  block: BlockType;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { draft, updateBlock, toggleDrill, completeBlock } = useSessionStore();
  const blockDraft = draft?.blocks[block.key];

  if (!blockDraft) return null;

  const allDrillsChecked = blockDraft.checkedDrills.every(Boolean);

  const handleComplete = () => {
    if (!blockDraft.quality) {
      Alert.alert('Quality required', 'Rate the quality of this block before completing.');
      return;
    }
    completeBlock(block.key);
    onToggleExpand(); // collapse
  };

  return (
    <Card
      neverCut={block.neverCut && !blockDraft.completed}
      style={{ marginBottom: 12 }}
    >
      {/* Header row */}
      <TouchableOpacity
        onPress={onToggleExpand}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingVertical: 4,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            {blockDraft.completed && (
              <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 14, color: '#4ADE80' }}>
                ✓
              </Text>
            )}
            <Text
              style={{
                fontFamily: 'Outfit_700Bold',
                fontSize: 19,
                color: blockDraft.completed ? '#4ADE80' : '#F0F2F0',
              }}
            >
              {block.name}
            </Text>
            {block.neverCut && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#7F1D1D',
                  borderRadius: 2,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMMono_400Regular',
                    fontSize: 8,
                    color: '#EF4444',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Never Cut
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 13, color: '#8A8F8C' }}>
            {block.durationMin} min
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {blockDraft.completed && blockDraft.metricResult && (
            <MetricBadge value={blockDraft.metricResult} met />
          )}
          <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 20, color: '#8A8F8C' }}>
            {isExpanded ? '−' : '+'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && !blockDraft.completed && (
        <View style={{ marginTop: 18, borderTopWidth: 1, borderTopColor: '#2A2E2C', paddingTop: 18 }}>
          {/* Description */}
          <Text
            style={{
              fontFamily: 'Outfit_400Regular',
              fontSize: 15,
              color: '#8A8F8C',
              marginBottom: 16,
              lineHeight: 22,
              fontStyle: 'italic',
            }}
          >
            {block.description}
          </Text>

          {/* Drills checklist */}
          <SectionHeader title="Drills" />
          {block.drills.map((drill, i) => {
            const checked = blockDraft.checkedDrills[i];
            return (
              <TouchableOpacity
                key={i}
                onPress={() => toggleDrill(block.key, i)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                  borderBottomWidth: i < block.drills.length - 1 ? 1 : 0,
                  borderBottomColor: '#2A2E2C',
                }}
                accessibilityLabel={`Toggle drill: ${drill}`}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderWidth: 2,
                    borderRadius: 4,
                    borderColor: checked ? '#4ADE80' : '#4A4E4C',
                    backgroundColor: checked ? '#4ADE80' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {checked && (
                    <Text
                      style={{
                        fontFamily: 'Outfit_700Bold',
                        fontSize: 18,
                        lineHeight: 20,
                        color: '#0D0F0E',
                      }}
                    >
                      ✓
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontFamily: checked ? 'Outfit_400Regular' : 'Outfit_600SemiBold',
                    fontSize: 17,
                    color: checked ? '#4A4E4C' : '#F0F2F0',
                    flex: 1,
                    lineHeight: 26,
                    textDecorationLine: checked ? 'line-through' : 'none',
                  }}
                >
                  {drill}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Sequence toggle */}
          {block.swingKeyCritical && (
            <SequenceToggle
              value={blockDraft.sequenceFeltRight}
              onChange={(v) => updateBlock(block.key, { sequenceFeltRight: v })}
            />
          )}

          {/* Metric input */}
          <MetricInput
            block={block}
            value={blockDraft.metricResult}
            onChange={(v) => updateBlock(block.key, { metricResult: v })}
          />

          {/* Quality */}
          <QualityRating
            value={blockDraft.quality}
            onChange={(q) => updateBlock(block.key, { quality: q })}
          />

          {/* Notes */}
          <Text style={[labelStyle, { marginTop: 12 }]}>Notes</Text>
          <TextInput
            value={blockDraft.notes}
            onChangeText={(t) => updateBlock(block.key, { notes: t })}
            placeholder="Optional..."
            placeholderTextColor="#4A4E4C"
            multiline
            numberOfLines={3}
            style={[inputStyle, { height: 96, textAlignVertical: 'top', paddingTop: 12, fontSize: 16 }]}
          />

          {/* Complete button */}
          <TouchableOpacity
            onPress={handleComplete}
            accessibilityLabel={`Complete ${block.name} block`}
            style={{
              marginTop: 18,
              height: 56,
              borderWidth: 2,
              borderColor: '#4ADE80',
              borderRadius: 6,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Outfit_700Bold',
                fontSize: 15,
                color: '#4ADE80',
                letterSpacing: 2,
              }}
            >
              COMPLETE BLOCK
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────
// Session Summary Modal
// ──────────────────────────────────────────────────────────

function SessionSummary({
  routine,
  onSave,
  isSaving,
}: {
  routine: DayRoutine;
  onSave: () => void;
  isSaving: boolean;
}) {
  const { draft, setOverallQuality, setNotes } = useSessionStore();
  if (!draft) return null;

  const completedCount = Object.values(draft.blocks).filter((b) => b.completed).length;
  const totalCount = routine.blocks.length;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0D0F0E',
        padding: 20,
        paddingBottom: 40,
      }}
    >
      <SectionHeader title="Session Complete" subtitle={`${completedCount}/${totalCount} blocks completed`} />

      {routine.blocks.map((block) => {
        const b = draft.blocks[block.key];
        return (
          <View
            key={block.key}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: '#2A2E2C',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'Outfit_600SemiBold',
                  fontSize: 14,
                  color: b?.completed ? '#F0F2F0' : '#4A4E4C',
                }}
              >
                {block.name}
              </Text>
              {b?.metricResult && (
                <Text
                  style={{
                    fontFamily: 'DMMono_400Regular',
                    fontSize: 11,
                    color: '#8A8F8C',
                  }}
                >
                  {b.metricResult}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {b?.quality && (
                <Text
                  style={{
                    fontFamily: 'DMMono_400Regular',
                    fontSize: 12,
                    color: '#8A8F8C',
                  }}
                >
                  Q{b.quality}
                </Text>
              )}
              {b?.sequenceFeltRight != null && (
                <Text
                  style={{
                    fontFamily: 'DMMono_400Regular',
                    fontSize: 11,
                    color: b.sequenceFeltRight ? '#4ADE80' : '#F59E0B',
                  }}
                >
                  {b.sequenceFeltRight ? 'SEQ ✓' : 'SEQ ✗'}
                </Text>
              )}
              <Text
                style={{
                  fontFamily: 'DMMono_400Regular',
                  fontSize: 16,
                  color: b?.completed ? '#4ADE80' : '#4A4E4C',
                }}
              >
                {b?.completed ? '✓' : '○'}
              </Text>
            </View>
          </View>
        );
      })}

      <View style={{ marginTop: 20 }}>
        <QualityRating
          value={draft.overallQuality}
          onChange={setOverallQuality}
          label="Overall Session Quality"
        />
        <Text style={[labelStyle, { marginTop: 12 }]}>Session Notes</Text>
        <TextInput
          value={draft.notes}
          onChangeText={setNotes}
          placeholder="Key takeaways, feels, breakthroughs..."
          placeholderTextColor="#4A4E4C"
          multiline
          numberOfLines={3}
          style={[inputStyle, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
        />
      </View>

      <TouchableOpacity
        onPress={onSave}
        disabled={isSaving}
        accessibilityLabel="Save session to database"
        style={{
          marginTop: 20,
          height: 50,
          backgroundColor: '#4ADE80',
          borderRadius: 4,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isSaving ? 0.7 : 1,
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
            SAVE SESSION
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────────────────

export default function SessionScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const validDay = (day as 'tuesday' | 'wednesday' | 'thursday') ?? 'tuesday';
  const routine = getRoutineForDay(validDay);

  const {
    draft,
    startSession,
    saveSession,
    loadDraft,
    clearDraft,
    isSaving,
    error,
  } = useSessionStore();

  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadDraft();
      if (!useSessionStore.getState().draft && routine) {
        startSession(routine);
      }
    };
    init();
  }, []);

  const toggleBlock = useCallback((key: string) => {
    setExpandedBlock((prev) => (prev === key ? null : key));
  }, []);

  const allBlocksDone = draft
    ? Object.values(draft.blocks).every((b) => b.completed)
    : false;

  const handleSave = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const sessionId = await saveSession(data.user.id);
    if (sessionId) {
      clearDraft();
      Alert.alert('Saved', 'Session logged.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/practice') },
      ]);
    }
  };

  if (!routine) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0F0E', padding: 20 }}>
        <Text style={{ fontFamily: 'Outfit_400Regular', color: '#8A8F8C' }}>
          No routine found for day: {day}
        </Text>
      </SafeAreaView>
    );
  }

  if (!draft) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0F0E', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#4ADE80" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0F0E' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#2A2E2C',
        }}
      >
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: '#8A8F8C' }}>
            ← Back
          </Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 11, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: 2 }}>
            {routine.day}
          </Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: '#F0F2F0' }}>
            {routine.focus}
          </Text>
        </View>
        <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 11, color: '#4A4E4C' }}>
          {routine.totalMinutes}m
        </Text>
      </View>

      {showSummary ? (
        <ScrollView>
          <SessionSummary routine={routine} onSave={handleSave} isSaving={isSaving} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Swing Key card */}
          <Card style={{ marginBottom: 18, borderColor: '#2A2E2C' }}>
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 11,
                color: '#4ADE80',
                textTransform: 'uppercase',
                letterSpacing: 2,
                marginBottom: 10,
              }}
            >
              Swing Key
            </Text>
            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 16,
                color: '#F0F2F0',
                lineHeight: 26,
              }}
            >
              {routine.swingKey}
            </Text>
          </Card>

          {/* Block list */}
          {routine.blocks.map((block) => (
            <BlockCard
              key={block.key}
              block={block}
              isExpanded={expandedBlock === block.key}
              onToggleExpand={() => toggleBlock(block.key)}
            />
          ))}

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

          {/* Finish session */}
          <TouchableOpacity
            onPress={() => setShowSummary(true)}
            accessibilityLabel="Finish session and review"
            style={{
              height: 50,
              backgroundColor: allBlocksDone ? '#4ADE80' : '#1A1D1B',
              borderWidth: 1,
              borderColor: allBlocksDone ? '#4ADE80' : '#2A2E2C',
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 8,
            }}
          >
            <Text
              style={{
                fontFamily: 'Outfit_700Bold',
                fontSize: 14,
                color: allBlocksDone ? '#0D0F0E' : '#4A4E4C',
                letterSpacing: 1,
              }}
            >
              {allBlocksDone ? 'FINISH SESSION' : 'REVIEW & SAVE'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const labelStyle = {
  fontFamily: 'Outfit_400Regular' as const,
  fontSize: 13,
  color: '#8A8F8C',
  marginBottom: 8,
  textTransform: 'uppercase' as const,
  letterSpacing: 1,
};

const inputStyle = {
  backgroundColor: '#0D0F0E',
  borderWidth: 1,
  borderColor: '#2A2E2C',
  borderRadius: 4,
  height: 52,
  paddingHorizontal: 14,
  fontFamily: 'Outfit_400Regular' as const,
  fontSize: 16,
  color: '#F0F2F0',
};
