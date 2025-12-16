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
import { AppLogo, Button, Input, UserTypeCard } from '@/components';
import { API_URL } from '@/constants/api';
import { setAuthToken } from '@/services/auth';

export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<string>('Client');

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    try {
      // Step 1: Register the user
      const registerResponse = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
            // send role in lowercase to match backend enum values
            role: selectedUserType.toLowerCase(),
        }),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        Alert.alert('Registration Failed', registerData.detail || 'An error occurred.');
        return;
      }

      // Step 2: Automatically log in the user after successful registration
      const loginParams = new URLSearchParams();
      loginParams.append('username', email);
      loginParams.append('password', password);

      const loginResponse = await fetch(`${API_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: loginParams.toString(),
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok) {
        await setAuthToken(loginData.access_token);
        Alert.alert('Success', 'Registration successful!');
        
        // Navigate based on role
        if (loginData.role === 'client') {
          router.push('/client-dashboard');
        } else {
          router.push('/professional-dashboard');
        }
      } else {
        Alert.alert('Login Failed', 'Registration successful but auto-login failed. Please log in manually.');
        router.push('/welcome');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  const userTypes = [
    { id: 'Client', title: 'Client', iconName: 'heart' as const },
    { id: 'Doctor', title: 'Doctor', iconName: 'medical' as const },
    { id: 'Trainer', title: 'Trainer', iconName: 'fitness' as const },
    { id: 'Nutritionist', title: 'Nutritionist', iconName: 'nutrition' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
          <Text style={styles.backButtonText}>← Back to Login</Text>
        </TouchableOpacity>

        {/* App Logo */}
        <AppLogo />

        {/* Welcome Message */}
        <Text style={styles.welcomeText}>
          Create your account to start your health journey.
        </Text>

        {/* Registration Form Card */}
        <View style={styles.registerCard}>
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={fullName}
            onChangeText={setFullName}
          />
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

          {/* User Type Selection */}
          <View style={styles.userTypeSection}>
            <Text style={styles.userTypeLabel}>I am a...</Text>
            <View style={styles.userTypeGrid}>
              {userTypes.map((userType) => (
                <UserTypeCard
                  key={userType.id}
                  title={userType.title}
                  iconName={userType.iconName}
                  isSelected={selectedUserType === userType.id}
                  onPress={() => setSelectedUserType(userType.id)}
                />
              ))}
            </View>
          </View>

          <Button title="Create Account" onPress={handleRegister} style={styles.registerButton} />

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleBackToLogin}>
              <Text style={styles.loginLink}>Login</Text>
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
};

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
  backButton: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#20B2AA',
    fontWeight: '500',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  registerCard: {
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
  userTypeSection: {
    marginVertical: 24,
  },
  userTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 16,
  },
  userTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
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


