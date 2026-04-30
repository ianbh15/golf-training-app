import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type SequenceToggleProps = {
  value: boolean | null;
  onChange: (value: boolean) => void;
};

export function SequenceToggle({ value, onChange }: SequenceToggleProps) {
  const yesSelected = value === true;
  const noSelected = value === false;

  return (
    <View style={{ marginVertical: 12 }}>
      <Text
        style={{
          fontFamily: 'Outfit_400Regular',
          fontSize: 13,
          color: '#8A8F8C',
          marginBottom: 10,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Sequence felt right?
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={() => onChange(true)}
          accessibilityLabel="Sequence felt right: Yes"
          style={{
            flex: 1,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderRadius: 6,
            borderColor: yesSelected ? '#4ADE80' : '#2A2E2C',
            backgroundColor: yesSelected ? '#4ADE80' : '#1A1D1B',
          }}
        >
          <Text
            style={{
              fontFamily: 'Outfit_700Bold',
              fontSize: 18,
              letterSpacing: 2,
              color: yesSelected ? '#0D0F0E' : '#8A8F8C',
            }}
          >
            YES
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onChange(false)}
          accessibilityLabel="Sequence felt right: No"
          style={{
            flex: 1,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderRadius: 6,
            borderColor: noSelected ? '#F59E0B' : '#2A2E2C',
            backgroundColor: noSelected ? '#F59E0B' : '#1A1D1B',
          }}
        >
          <Text
            style={{
              fontFamily: 'Outfit_700Bold',
              fontSize: 18,
              letterSpacing: 2,
              color: noSelected ? '#0D0F0E' : '#8A8F8C',
            }}
          >
            NO
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
