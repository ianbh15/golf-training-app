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
    <View style={{ marginVertical: 12 }}>
      {label ? (
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
          {label}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              accessibilityLabel={`Quality ${n}: ${LABELS[n]}`}
              style={{
                flex: 1,
                height: 60,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderRadius: 6,
                borderColor: selected ? '#4ADE80' : '#2A2E2C',
                backgroundColor: selected ? '#4ADE80' : '#1A1D1B',
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMMono_500Medium',
                  fontSize: 22,
                  color: selected ? '#0D0F0E' : '#F0F2F0',
                }}
              >
                {n}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value ? (
        <Text
          style={{
            fontFamily: 'Outfit_600SemiBold',
            fontSize: 13,
            color: '#8A8F8C',
            marginTop: 8,
            textAlign: 'center',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {LABELS[value]}
        </Text>
      ) : null}
    </View>
  );
}
