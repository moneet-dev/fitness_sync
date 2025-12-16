import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_URL } from '@/constants/api';

export default function ConnectionTest() {
  const [result, setResult] = useState<string>('Not tested yet');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(`✅ SUCCESS!\n\nStatus: ${response.status}\nMessage: ${data.message}\n\nBackend is reachable at:\n${API_URL}`);
      } else {
        setResult(`❌ FAILED\n\nStatus: ${response.status}\nError: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      setResult(`❌ CONNECTION ERROR\n\nCannot reach backend at:\n${API_URL}\n\nError: ${error.message}\n\nPossible issues:\n- Backend not running\n- Wrong IP address in app.json\n- Firewall blocking connection\n- Device not on same network`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Backend Connection Test</Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>API URL:</Text>
          <Text style={styles.infoValue}>{API_URL}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={testConnection}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Testing...' : 'Test Connection'}
          </Text>
        </TouchableOpacity>

        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Result:</Text>
          <Text style={styles.resultText}>{result}</Text>
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📋 Troubleshooting Steps:</Text>
          <Text style={styles.instructionsText}>
            1. Make sure backend is running:{'\n'}
            {'   '}uvicorn backendV0.main:app --reload --host 0.0.0.0 --port 8000{'\n\n'}
            2. Check your computer's LAN IP:{'\n'}
            {'   '}ipconfig (look for IPv4 Address){'\n\n'}
            3. Update app.json "extra.API_URL" with your LAN IP{'\n\n'}
            4. Restart Expo: npx expo start --clear{'\n\n'}
            5. Make sure device/emulator is on same network
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 16,
    color: '#20B2AA',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#20B2AA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    minHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  instructionsCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE066',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    fontFamily: 'monospace',
  },
});
