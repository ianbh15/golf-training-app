import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useDrillStore } from '../../../lib/store/drillStore';
import { Card } from '../../../components/ui/Card';

const CATEGORIES = ['All', 'Putting', 'Short Game', 'Ball Striking', 'Driver', 'Mental', 'Warmup', 'Other'];

const CATEGORY_COLOR: Record<string, string> = {
  Putting: '#4ADE80',
  'Short Game': '#F59E0B',
  'Ball Striking': '#60A5FA',
  Driver: '#A78BFA',
  Mental: '#F472B6',
  Warmup: '#34D399',
  Other: '#8A8F8C',
};

export default function DrillLibraryScreen() {
  const { drills, loading, fetchDrills, deleteDrill } = useDrillStore();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchDrills(data.user.id);
      }
    });
  }, [fetchDrills]);

  const filtered =
    activeCategory === 'All' ? drills : drills.filter((d) => d.category === activeCategory);

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Remove Drill', `Remove "${name}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteDrill(id) },
    ]);
  };

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
            Practice
          </Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#F0F2F0' }}>
            Drill Library
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 11,
              color: '#8A8F8C',
              letterSpacing: 1.5,
            }}
          >
            ← BACK
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category filter strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 44, borderBottomWidth: 1, borderBottomColor: '#2A2E2C' }}
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center', gap: 4 }}
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderBottomWidth: 2,
                borderBottomColor: active ? '#4ADE80' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMMono_500Medium',
                  fontSize: 10,
                  color: active ? '#4ADE80' : '#4A4E4C',
                  letterSpacing: 1.5,
                }}
              >
                {cat.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#4ADE80" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Count */}
          {drills.length > 0 && (
            <Text
              style={{
                fontFamily: 'DMMono_400Regular',
                fontSize: 10,
                color: '#4A4E4C',
                letterSpacing: 1.5,
                marginBottom: 12,
              }}
            >
              {filtered.length} DRILL{filtered.length !== 1 ? 'S' : ''}
              {activeCategory !== 'All' ? ` · ${activeCategory.toUpperCase()}` : ''}
            </Text>
          )}

          {filtered.length === 0 ? (
            <Card style={{ marginTop: 8 }}>
              <Text
                style={{
                  fontFamily: 'Outfit_400Regular',
                  fontSize: 14,
                  color: '#8A8F8C',
                  textAlign: 'center',
                  paddingVertical: 20,
                  lineHeight: 21,
                }}
              >
                {drills.length === 0
                  ? 'No drills yet.\nTap + ADD DRILL to build your library.'
                  : `No drills in ${activeCategory}.`}
              </Text>
            </Card>
          ) : (
            filtered.map((drill) => (
              <Card key={drill.id} style={{ marginBottom: 10 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    {/* Name + never-cut badge */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 6,
                        marginBottom: 5,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Outfit_700Bold',
                          fontSize: 15,
                          color: '#F0F2F0',
                        }}
                      >
                        {drill.name}
                      </Text>
                      {drill.never_cut && (
                        <View
                          style={{
                            borderWidth: 1,
                            borderColor: '#F59E0B',
                            paddingHorizontal: 5,
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

                    {/* Category + duration */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: drill.description ? 6 : 0,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: CATEGORY_COLOR[drill.category] ?? '#8A8F8C',
                        }}
                      />
                      <Text
                        style={{
                          fontFamily: 'DMMono_400Regular',
                          fontSize: 10,
                          color: '#8A8F8C',
                          letterSpacing: 1,
                        }}
                      >
                        {drill.category.toUpperCase()} · {drill.duration_minutes} MIN
                      </Text>
                    </View>

                    {drill.description ? (
                      <Text
                        style={{
                          fontFamily: 'Outfit_400Regular',
                          fontSize: 12,
                          color: '#8A8F8C',
                          lineHeight: 17,
                        }}
                      >
                        {drill.description}
                      </Text>
                    ) : null}
                  </View>

                  {/* Delete */}
                  <TouchableOpacity
                    onPress={() => handleDelete(drill.id, drill.name)}
                    hitSlop={8}
                    accessibilityLabel={`Remove ${drill.name}`}
                  >
                    <Text
                      style={{ fontFamily: 'DMMono_500Medium', fontSize: 20, color: '#4A4E4C' }}
                    >
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}

      {/* ADD DRILL button */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/practice/add-drill')}
        accessibilityLabel="Add a new drill"
        style={{
          position: 'absolute',
          bottom: 24,
          right: 20,
          backgroundColor: '#4ADE80',
          borderRadius: 4,
          paddingHorizontal: 20,
          paddingVertical: 14,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        <Text
          style={{
            fontFamily: 'Outfit_700Bold',
            fontSize: 13,
            color: '#0D0F0E',
            letterSpacing: 1,
          }}
        >
          + ADD DRILL
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
