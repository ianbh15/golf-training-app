import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { usePlanStore } from '../../../lib/store/planStore';
import { useDrillStore } from '../../../lib/store/drillStore';
import type { DayRoutine } from '../../../constants/routine';

const GOAL_OPTIONS = [
  'Ball Striking',
  'Short Game',
  'Scoring',
  'Putting',
  'Driving',
  'Consistency',
  'Mental Game',
];

const DAYS_OPTIONS = [2, 3, 4, 5, 6];
const SESSION_LENGTH_OPTIONS = [30, 45, 60, 75, 90];

function isDayRoutineArray(v: unknown): v is DayRoutine[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (d) =>
      d &&
      typeof d === 'object' &&
      typeof (d as DayRoutine).day === 'string' &&
      Array.isArray((d as DayRoutine).blocks)
  );
}

export default function BuildPlanScreen() {
  const { saveAiPlan } = usePlanStore();
  const { drills, fetchDrills } = useDrillStore();

  const [handicap, setHandicap] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3);
  const [sessionMinutes, setSessionMinutes] = useState<number>(45);
  const [weaknesses, setWeaknesses] = useState('');
  const [planName, setPlanName] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) fetchDrills(data.user.id);
    });
  }, [fetchDrills]);

  const toggleGoal = (g: string) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const handleGenerate = async () => {
    const hcp = parseFloat(handicap);
    if (isNaN(hcp)) {
      Alert.alert('Missing handicap', 'Enter your current handicap.');
      return;
    }
    if (goals.length === 0) {
      Alert.alert('Pick goals', 'Select at least one primary goal.');
      return;
    }

    setGenerating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        Alert.alert('Not signed in', 'Sign in again to generate a plan.');
        setGenerating(false);
        return;
      }

      // Call ai-coach Edge Function with type=plan_generation
      const customDrills = drills.map((d) => ({
        name: d.name,
        durationMinutes: d.duration_minutes,
        category: d.category,
        description: d.description,
        neverCut: d.never_cut,
      }));

      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: {
          type: 'plan_generation',
          context: {
            handicap: hcp,
            goals,
            daysPerWeek,
            sessionMinutes,
            weaknesses: weaknesses.trim() || null,
            customDrills: customDrills.length > 0 ? customDrills : undefined,
          },
        },
      });

      if (error) {
        Alert.alert(
          'Generation failed',
          `${error.message ?? 'Edge function error'}\n\nMake sure ANTHROPIC_API_KEY is set as a Supabase secret and the ai-coach function is deployed.`
        );
        setGenerating(false);
        return;
      }

      const plan = (data as { plan?: unknown })?.plan;
      if (!isDayRoutineArray(plan)) {
        Alert.alert('Invalid plan', 'The AI returned an unexpected format. Try again.');
        setGenerating(false);
        return;
      }

      const saved = await saveAiPlan(
        userData.user.id,
        plan,
        planName.trim() || `${goals[0]} Plan`
      );

      setGenerating(false);

      if (saved) {
        Alert.alert('Plan ready', 'Your custom plan is now active.', [
          { text: 'View plan', onPress: () => router.replace('/(tabs)/practice') },
        ]);
      } else {
        Alert.alert('Save failed', 'Plan was generated but could not be saved.');
      }
    } catch (err) {
      setGenerating(false);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0F0E' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
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
              AI · Plan Builder
            </Text>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#F0F2F0' }}>
              Build a New Plan
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 12,
                color: '#8A8F8C',
                letterSpacing: 1.5,
              }}
            >
              CLOSE
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Handicap */}
          <Field label="Current Handicap">
            <TextInput
              value={handicap}
              onChangeText={setHandicap}
              keyboardType="decimal-pad"
              placeholder="e.g. 3.2"
              placeholderTextColor="#4A4E4C"
              style={inputStyle}
            />
          </Field>

          {/* Goals */}
          <Field label="Primary Goals" hint="Tap any that apply">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GOAL_OPTIONS.map((g) => {
                const active = goals.includes(g);
                return (
                  <TouchableOpacity
                    key={g}
                    onPress={() => toggleGoal(g)}
                    accessibilityLabel={`Toggle goal ${g}`}
                    style={{
                      borderWidth: 1,
                      borderColor: active ? '#4ADE80' : '#2A2E2C',
                      backgroundColor: active ? 'rgba(74, 222, 128, 0.08)' : '#1A1D1B',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Outfit_600SemiBold',
                        fontSize: 12,
                        color: active ? '#4ADE80' : '#8A8F8C',
                        letterSpacing: 0.5,
                      }}
                    >
                      {g.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          {/* Days per week */}
          <Field label="Days Available Per Week">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {DAYS_OPTIONS.map((d) => {
                const active = daysPerWeek === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDaysPerWeek(d)}
                    style={{
                      flex: 1,
                      height: 44,
                      borderWidth: 1,
                      borderColor: active ? '#4ADE80' : '#2A2E2C',
                      backgroundColor: active ? 'rgba(74, 222, 128, 0.08)' : '#1A1D1B',
                      borderRadius: 4,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMMono_500Medium',
                        fontSize: 16,
                        color: active ? '#4ADE80' : '#8A8F8C',
                      }}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          {/* Session length */}
          <Field label="Session Length" hint="Minutes per session">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {SESSION_LENGTH_OPTIONS.map((m) => {
                const active = sessionMinutes === m;
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setSessionMinutes(m)}
                    style={{
                      flex: 1,
                      height: 44,
                      borderWidth: 1,
                      borderColor: active ? '#4ADE80' : '#2A2E2C',
                      backgroundColor: active ? 'rgba(74, 222, 128, 0.08)' : '#1A1D1B',
                      borderRadius: 4,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMMono_500Medium',
                        fontSize: 14,
                        color: active ? '#4ADE80' : '#8A8F8C',
                      }}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          {/* Weaknesses */}
          <Field label="Specific Weaknesses" hint="Optional · what's costing you shots">
            <TextInput
              value={weaknesses}
              onChangeText={setWeaknesses}
              multiline
              numberOfLines={3}
              placeholder="e.g. I bail out of wedges 80–110, three-putt from outside 30 ft"
              placeholderTextColor="#4A4E4C"
              style={[inputStyle, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
            />
          </Field>

          {/* Optional plan name */}
          <Field label="Plan Name" hint="Optional">
            <TextInput
              value={planName}
              onChangeText={setPlanName}
              placeholder="e.g. Spring Tune-Up"
              placeholderTextColor="#4A4E4C"
              style={inputStyle}
            />
          </Field>

          {/* Generate */}
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={generating}
            accessibilityLabel="Generate plan"
            style={{
              height: 52,
              backgroundColor: '#4ADE80',
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 12,
              opacity: generating ? 0.7 : 1,
            }}
          >
            {generating ? (
              <ActivityIndicator color="#0D0F0E" />
            ) : (
              <Text
                style={{
                  fontFamily: 'Outfit_700Bold',
                  fontSize: 14,
                  color: '#0D0F0E',
                  letterSpacing: 1,
                }}
              >
                GENERATE PLAN
              </Text>
            )}
          </TouchableOpacity>

          <Text
            style={{
              fontFamily: 'Outfit_400Regular',
              fontSize: 11,
              color: '#4A4E4C',
              marginTop: 12,
              lineHeight: 16,
              textAlign: 'center',
            }}
          >
            Plan is generated by Claude via the ai-coach Edge Function.{'\n'}
            Requires ANTHROPIC_API_KEY set as a Supabase secret.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontFamily: 'DMMono_500Medium',
          fontSize: 10,
          color: '#8A8F8C',
          letterSpacing: 2,
          marginBottom: 6,
        }}
      >
        {label.toUpperCase()}
      </Text>
      {hint && (
        <Text
          style={{
            fontFamily: 'Outfit_400Regular',
            fontSize: 11,
            color: '#4A4E4C',
            marginBottom: 8,
          }}
        >
          {hint}
        </Text>
      )}
      {children}
    </View>
  );
}

const inputStyle = {
  backgroundColor: '#1A1D1B',
  borderWidth: 1,
  borderColor: '#2A2E2C',
  borderRadius: 4,
  height: 48,
  paddingHorizontal: 14,
  fontFamily: 'Outfit_400Regular' as const,
  fontSize: 15,
  color: '#F0F2F0' as const,
};
