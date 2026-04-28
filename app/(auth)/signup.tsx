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
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Enter email and password.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const emailRedirectTo = Linking.createURL('/(auth)/login');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Signup Failed', error.message);
    } else {
      Alert.alert(
        'Check your email',
        'A confirmation link has been sent. Confirm your email then sign in.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
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
        <View style={{ marginBottom: 48, alignItems: 'flex-start' }}>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 52, color: '#F0F2F0', lineHeight: 56 }}>
            GoL<Text style={{ color: '#4ADE80' }}>o</Text>
          </Text>
          <Text
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 11,
              color: '#4A4E4C',
              letterSpacing: 3,
              marginTop: 6,
            }}
          >
            Log. Learn. GoLo.
          </Text>
        </View>

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
              placeholder="8+ characters"
              placeholderTextColor="#4A4E4C"
              style={inputStyle}
            />
          </View>

          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            accessibilityLabel="Create Account"
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
                CREATE ACCOUNT
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={{ alignItems: 'center', marginTop: 16 }}
          >
            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 14,
                color: '#8A8F8C',
              }}
            >
              Already have an account?{' '}
              <Text style={{ color: '#4ADE80' }}>Sign in</Text>
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
