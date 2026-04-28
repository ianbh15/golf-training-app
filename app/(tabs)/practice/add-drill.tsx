import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useDrillStore } from '../../../lib/store/drillStore';

const CATEGORIES = [
  'Putting',
  'Short Game',
  'Ball Striking',
  'Driver',
  'Mental',
  'Warmup',
  'Other',
];

export default function AddDrillScreen() {
  const { addDrill } = useDrillStore();

  const [name, setName] = useState('');
  const [durationStr, setDurationStr] = useState('10');
  const [category, setCategory] = useState('Putting');
  const [description, setDescription] = useState('');
  const [neverCut, setNeverCut] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give your drill a name.');
      return;
    }
    const duration = parseInt(durationStr, 10);
    if (isNaN(duration) || duration < 1) {
      Alert.alert('Invalid duration', 'Enter a duration in whole minutes.');
      return;
    }

    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      Alert.alert('Not signed in');
      setSaving(false);
      return;
    }

    const ok = await addDrill(userData.user.id, {
      name: name.trim(),
      duration_minutes: duration,
      category,
      description: description.trim() || null,
      never_cut: neverCut,
    });

    setSaving(false);
    if (ok) {
      router.back();
    } else {
      Alert.alert('Save failed', 'Could not save the drill. Try again.');
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
              Drill Library
            </Text>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#F0F2F0' }}>
              Add Drill
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
          <Field label="Drill Name">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. 100-Ball 3-Foot Circle"
              placeholderTextColor="#4A4E4C"
              style={inputStyle}
            />
          </Field>

          <Field label="Duration" hint="Minutes">
            <TextInput
              value={durationStr}
              onChangeText={setDurationStr}
              keyboardType="number-pad"
              placeholderTextColor="#4A4E4C"
              style={inputStyle}
            />
          </Field>

          <Field label="Category">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
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
                      {cat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          <Field label="Description" hint="Optional · quick cue or setup notes">
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholder="e.g. Gate drill — 2 tees just wider than putter head, focus on face contact"
              placeholderTextColor="#4A4E4C"
              style={[inputStyle, { height: 84, textAlignVertical: 'top', paddingTop: 12 }]}
            />
          </Field>

          {/* Never Cut toggle */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 14,
              borderTopWidth: 1,
              borderTopColor: '#2A2E2C',
              marginBottom: 24,
            }}
          >
            <View>
              <Text
                style={{
                  fontFamily: 'DMMono_500Medium',
                  fontSize: 10,
                  color: '#8A8F8C',
                  letterSpacing: 2,
                }}
              >
                NEVER CUT
              </Text>
              <Text
                style={{
                  fontFamily: 'Outfit_400Regular',
                  fontSize: 11,
                  color: '#4A4E4C',
                  marginTop: 3,
                }}
              >
                Always include this drill in AI-generated plans
              </Text>
            </View>
            <Switch
              value={neverCut}
              onValueChange={setNeverCut}
              trackColor={{ false: '#2A2E2C', true: 'rgba(74,222,128,0.5)' }}
              thumbColor={neverCut ? '#4ADE80' : '#8A8F8C'}
            />
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel="Save drill"
            style={{
              height: 52,
              backgroundColor: '#4ADE80',
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
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
                SAVE DRILL
              </Text>
            )}
          </TouchableOpacity>
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
