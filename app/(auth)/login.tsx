import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Enter email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#0D0F0E' }}
    >
      <ScrollView
        contentContainerStyle={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / wordmark */}
        <View style={{ marginBottom: 48 }}>
          <Text
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 11,
              color: '#4ADE80',
              letterSpacing: 4,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Golf Performance OS
          </Text>
          <Text
            style={{
              fontFamily: 'Outfit_700Bold',
              fontSize: 28,
              color: '#F0F2F0',
              lineHeight: 34,
            }}
          >
            Welcome back,{'\n'}Ian.
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 16 }}>
          <View>
            <Text style={labelStyle}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="ian@example.com"
              placeholderTextColor="#4A4E4C"
              style={inputStyle}
            />
          </View>

          <View>
            <Text style={labelStyle}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
              placeholderTextColor="#4A4E4C"
              style={inputStyle}
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            accessibilityLabel="Sign In"
            style={{
              height: 50,
              backgroundColor: '#4ADE80',
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#0D0F0E" />
            ) : (
              <Text
                style={{
                  fontFamily: 'Outfit_700Bold',
                  fontSize: 15,
                  color: '#0D0F0E',
                  letterSpacing: 0.5,
                }}
              >
                SIGN IN
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/signup')}
            style={{ alignItems: 'center', marginTop: 16 }}
          >
            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 14,
                color: '#8A8F8C',
              }}
            >
              No account?{' '}
              <Text style={{ color: '#4ADE80' }}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const labelStyle = {
  fontFamily: 'Outfit_400Regular' as const,
  fontSize: 12,
  color: '#8A8F8C',
  marginBottom: 6,
  textTransform: 'uppercase' as const,
  letterSpacing: 1,
};

const inputStyle = {
  backgroundColor: '#1A1D1B',
  borderWidth: 1,
  borderColor: '#2A2E2C',
  borderRadius: 4,
  height: 48,
  paddingHorizontal: 14,
  fontFamily: 'Outfit_400Regular' as const,
  fontSize: 15,
  color: '#F0F2F0',
};
