import React from 'react';
import { View, Text } from 'react-native';

type MetricBadgeProps = {
  value: string | null;
  target?: string;
  met?: boolean;
};

export function MetricBadge({ value, target, met }: MetricBadgeProps) {
  if (!value) return null;

  const color = met === true ? '#4ADE80' : met === false ? '#F59E0B' : '#8A8F8C';

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: color,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Text
        style={{
          fontFamily: 'DMMono_400Regular',
          fontSize: 12,
          color,
        }}
      >
        {value}
      </Text>
      {met === true && (
        <Text style={{ fontSize: 11, color: '#4ADE80' }}>✓</Text>
      )}
    </View>
  );
}
