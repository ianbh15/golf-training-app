import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type QualityRatingProps = {
  value: number | null;
  onChange: (value: number) => void;
  label?: string;
};

const LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below',
  3: 'Solid',
  4: 'Good',
  5: 'Elite',
};

export function QualityRating({ value, onChange, label = 'Quality' }: QualityRatingProps) {
  return (
    <View style={{ marginVertical: 8 }}>
      {label ? (
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
          {label}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            accessibilityLabel={`Quality ${n}: ${LABELS[n]}`}
            style={{
              flex: 1,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderRadius: 4,
              borderColor: value === n ? '#4ADE80' : '#2A2E2C',
              backgroundColor: value === n ? 'rgba(74, 222, 128, 0.12)' : '#1A1D1B',
            }}
          >
            <Text
              style={{
                fontFamily: 'DMMono_400Regular',
                fontSize: 16,
                color: value === n ? '#4ADE80' : '#8A8F8C',
                fontWeight: value === n ? '600' : '400',
              }}
            >
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {value ? (
        <Text
          style={{
            fontFamily: 'Outfit_400Regular',
            fontSize: 11,
            color: '#4A4E4C',
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {LABELS[value]}
        </Text>
      ) : null}
    </View>
  );
}
