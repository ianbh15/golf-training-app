import React from 'react';
import { View, Text, ViewStyle } from 'react-native';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  neverCut?: boolean;
  className?: string;
};

export function Card({ children, style, neverCut = false, className = '' }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: '#1A1D1B',
          borderWidth: 1,
          borderColor: neverCut ? '#7F1D1D' : '#2A2E2C',
          borderRadius: 4,
          padding: 16,
        },
        style,
      ]}
      className={className}
    >
      {children}
    </View>
  );
}
