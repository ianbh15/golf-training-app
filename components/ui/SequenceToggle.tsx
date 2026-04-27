import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type SequenceToggleProps = {
  value: boolean | null;
  onChange: (value: boolean) => void;
};

export function SequenceToggle({ value, onChange }: SequenceToggleProps) {
  return (
    <View style={{ marginVertical: 8 }}>
      <Text
        style={{
          fontFamily: 'Outfit_400Regular',
          fontSize: 12,
          color: '#8A8F8C',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Sequence felt right?
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => onChange(true)}
          accessibilityLabel="Sequence felt right: Yes"
          style={{
            flex: 1,
            height: 38,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderRadius: 4,
            borderColor: value === true ? '#4ADE80' : '#2A2E2C',
            backgroundColor: value === true ? 'rgba(74, 222, 128, 0.12)' : '#1A1D1B',
          }}
        >
          <Text
            style={{
              fontFamily: 'Outfit_600SemiBold',
              fontSize: 13,
              color: value === true ? '#4ADE80' : '#8A8F8C',
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
            height: 38,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderRadius: 4,
            borderColor: value === false ? '#F59E0B' : '#2A2E2C',
            backgroundColor: value === false ? 'rgba(245, 158, 11, 0.12)' : '#1A1D1B',
          }}
        >
          <Text
            style={{
              fontFamily: 'Outfit_600SemiBold',
              fontSize: 13,
              color: value === false ? '#F59E0B' : '#8A8F8C',
            }}
          >
            NO
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
