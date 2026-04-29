import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    SplashScreen.hideAsync().catch(() => {});
    console.error('[GoLo] Uncaught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error;
      return (
        <View style={{ flex: 1, backgroundColor: '#0D0F0E', padding: 24, paddingTop: 80 }}>
          <Text style={{ color: '#F87171', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
            Startup error
          </Text>
          <Text style={{ color: '#F0F2F0', fontSize: 14, marginBottom: 16 }}>
            {err.name}: {err.message}
          </Text>
          <ScrollView style={{ flex: 1 }}>
            <Text style={{ color: '#8A8F8C', fontSize: 11, fontFamily: 'monospace' }}>
              {err.stack ?? '(no stack)'}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
