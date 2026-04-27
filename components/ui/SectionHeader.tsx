import React from 'react';
import { View, Text } from 'react-native';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  mono?: boolean;
};

export function SectionHeader({ title, subtitle, mono = false }: SectionHeaderProps) {
  return (
    <View style={{ marginBottom: 12, marginTop: 4 }}>
      <Text
        style={{
          fontFamily: mono ? 'DMMono_500Medium' : 'Outfit_700Bold',
          fontSize: 11,
          color: '#4ADE80',
          textTransform: 'uppercase',
          letterSpacing: 2,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            fontFamily: 'Outfit_400Regular',
            fontSize: 13,
            color: '#8A8F8C',
            marginTop: 2,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
