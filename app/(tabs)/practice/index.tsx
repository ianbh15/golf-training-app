import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { usePlanStore } from '../../../lib/store/planStore';
import { Card } from '../../../components/ui/Card';
import type { DayRoutine, BlockType } from '../../../constants/routine';

const DAY_LABEL: Record<string, string> = {
  tuesday: 'TUESDAY',
  wednesday: 'WEDNESDAY',
  thursday: 'THURSDAY',
};

function DayCard({
  day,
  expanded,
  onToggle,
}: {
  day: DayRoutine;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card style={{ marginBottom: 12, padding: 0 }}>
      {/* Header — tap to collapse */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.85}
        accessibilityLabel={`Toggle ${day.day} plan`}
        style={{ padding: 16 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 11,
                color: '#4ADE80',
                letterSpacing: 2.5,
                marginBottom: 4,
              }}
            >
              {DAY_LABEL[day.day] ?? day.day.toUpperCase()}
            </Text>
            <Text
              style={{
                fontFamily: 'Outfit_700Bold',
                fontSize: 20,
                color: '#F0F2F0',
              }}
            >
              {day.focus}
            </Text>
            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 12,
                color: '#8A8F8C',
                marginTop: 2,
              }}
            >
              {day.totalMinutes} min · {day.blocks.length} blocks
            </Text>
          </View>
          <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 16, color: '#4A4E4C' }}>
            {expanded ? '−' : '+'}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {/* Swing key — prominent at top of expanded section */}
          <View
            style={{
              borderLeftWidth: 2,
              borderLeftColor: '#4ADE80',
              paddingLeft: 12,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 9,
                color: '#4ADE80',
                letterSpacing: 2,
                marginBottom: 4,
              }}
            >
              SWING KEY
            </Text>
            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 13,
                color: '#F0F2F0',
                lineHeight: 19,
              }}
            >
              {day.swingKey}
            </Text>
          </View>

          {day.blocks.map((block) => (
            <BlockRow key={block.key} block={block} />
          ))}
        </View>
      )}
    </Card>
  );
}

function BlockRow({ block }: { block: BlockType }) {
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: '#2A2E2C',
        paddingVertical: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            <Text
              style={{
                fontFamily: 'Outfit_700Bold',
                fontSize: 14,
                color: '#F0F2F0',
              }}
            >
              {block.name}
            </Text>
            {block.neverCut && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#F59E0B',
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMMono_500Medium',
                    fontSize: 8,
                    color: '#F59E0B',
                    letterSpacing: 1.5,
                  }}
                >
                  NEVER CUT
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              fontFamily: 'Outfit_400Regular',
              fontSize: 12,
              color: '#8A8F8C',
              marginBottom: 8,
            }}
          >
            {block.description}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: 'DMMono_500Medium',
            fontSize: 12,
            color: '#4A4E4C',
          }}
        >
          {block.durationMin}m
        </Text>
      </View>

      {block.metric && (
        <View
          style={{
            backgroundColor: '#0D0F0E',
            borderWidth: 1,
            borderColor: '#2A2E2C',
            borderRadius: 4,
            padding: 8,
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 9,
              color: '#8A8F8C',
              letterSpacing: 1.5,
              marginBottom: 2,
            }}
          >
            METRIC · {block.metric.label.toUpperCase()}
          </Text>
          <Text
            style={{
              fontFamily: 'Outfit_400Regular',
              fontSize: 12,
              color: '#F0F2F0',
            }}
          >
            Target: {block.metric.target}
          </Text>
        </View>
      )}

      {block.drills.map((drill, i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 4 }}>
          <Text
            style={{
              fontFamily: 'DMMono_400Regular',
              fontSize: 11,
              color: '#4A4E4C',
              marginRight: 8,
              marginTop: 2,
            }}
          >
            ·
          </Text>
          <Text
            style={{
              fontFamily: 'Outfit_400Regular',
              fontSize: 13,
              color: '#F0F2F0',
              flex: 1,
              lineHeight: 18,
            }}
          >
            {drill}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function PracticePlanScreen() {
  const { activePlan, routine, loading, loadActivePlan } = usePlanStore();
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    tuesday: true,
    wednesday: true,
    thursday: true,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        loadActivePlan(data.user.id);
      }
    });
  }, [loadActivePlan]);

  const onRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    await loadActivePlan(userId);
    setRefreshing(false);
  };

  const toggle = (day: string) =>
    setExpanded((s) => ({ ...s, [day]: !s[day] }));

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
            Yardage Book
          </Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#F0F2F0' }}>
            My Plan
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/practice/history')}
          accessibilityLabel="View session history"
          hitSlop={10}
        >
          <Text
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 11,
              color: '#8A8F8C',
              letterSpacing: 1.5,
            }}
          >
            HISTORY →
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !activePlan ? (
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
          {/* Plan source label */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
            <View
              style={{
                width: 6,
                height: 6,
                backgroundColor: '#4ADE80',
              }}
            />
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 10,
                color: '#8A8F8C',
                letterSpacing: 2,
              }}
            >
              {activePlan?.generated_by === 'ai' ? 'AI · CUSTOM' : 'DEFAULT ROUTINE'}
              {activePlan?.name ? ` · ${activePlan.name.toUpperCase()}` : ''}
            </Text>
          </View>

          {/* Section A — Current Plan */}
          {routine.map((day) => (
            <DayCard
              key={day.day}
              day={day}
              expanded={expanded[day.day] ?? true}
              onToggle={() => toggle(day.day)}
            />
          ))}

          {/* Section B — Build a New Plan */}
          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 10,
                color: '#8A8F8C',
                letterSpacing: 2.5,
                marginBottom: 8,
              }}
            >
              CREATE / UPDATE
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/practice/build-plan')}
              accessibilityLabel="Build a new AI practice plan"
              style={{
                height: 52,
                borderWidth: 1,
                borderColor: '#4ADE80',
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Outfit_700Bold',
                  fontSize: 14,
                  color: '#4ADE80',
                  letterSpacing: 1,
                }}
              >
                BUILD A NEW PLAN
              </Text>
            </TouchableOpacity>
            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 12,
                color: '#4A4E4C',
                marginTop: 8,
                lineHeight: 17,
              }}
            >
              Generate a custom plan from your handicap, goals, available days, and weak areas. Your current plan is archived, never deleted.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
