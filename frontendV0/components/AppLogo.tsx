import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export const AppLogo: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.logoBackground}>
        <Ionicons name="heart" size={40} color="white" />
        <View style={styles.heartbeatLine} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBackground: {
    width: 80,
    height: 80,
    backgroundColor: '#20B2AA',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heartbeatLine: {
    position: 'absolute',
    bottom: 8,
    width: 60,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
});