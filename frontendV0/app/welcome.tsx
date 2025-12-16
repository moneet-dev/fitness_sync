import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppLogo, Button, Input } from '@/components';
import { API_URL } from '@/constants/api';
import { setAuthToken } from '@/services/auth';
import { useUser } from '@/context/UserContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { refreshUser } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    try {
      const response = await fetch(`${API_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthToken(data.access_token);

        // Refresh user context to load user data
        await refreshUser();

        // Navigate based on role (backend returns lowercase role strings)
        if (data.role === 'client') {
          router.replace('/client-dashboard');
        } else {
          router.replace('/professional-dashboard');
        }
      } else {
        Alert.alert('Login Failed', data.detail || 'Invalid credentials.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleForgotPassword = () => {
    // TODO: Implement forgot password logic
    console.log('Forgot password pressed');
  };

  const handleNavigateToRegister = () => {
    router.push('/register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Logo */}
        <AppLogo />

        {/* Welcome Message */}
        <Text style={styles.welcomeText}>
          Your journey to collaborative health management starts here.
        </Text>

        {/* Login Form Card */}
        <View style={styles.loginCard}>
          <Input
            label="Email Address"
            placeholder="john.doe@example.com"
            value={email}
            onChangeText={setEmail}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button title="Login" onPress={handleLogin} style={styles.loginButton} />

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleNavigateToRegister}>
              <Text style={styles.registerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with</Text>
          <View style={styles.vLogo}>
            <Text style={styles.vLogoText}>V</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#20B2AA',
    fontWeight: '500',
  },
  loginButton: {
    marginBottom: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    fontSize: 14,
    color: '#20B2AA',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 14,
    color: '#333',
  },
  vLogo: {
    width: 20,
    height: 20,
    backgroundColor: '#8A2BE2',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  vLogoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
