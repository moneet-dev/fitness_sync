import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProfessionalCardProps {
  name: string;
  specialty: string;
  isOnline?: boolean;
  onChat: () => void;
  style?: any;
}

export const ProfessionalCard: React.FC<ProfessionalCardProps> = ({
  name,
  specialty,
  isOnline = false,
  onChat,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.profileSection}>
        <View style={styles.profileImageContainer}>
          <View style={styles.profileImage}>
            <Ionicons name="person" size={24} color="white" />
          </View>
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.specialty}>{specialty}</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.chatButton} onPress={onChat}>
        <Ionicons name="chatbubble" size={20} color="#20B2AA" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#20B2AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  specialty: {
    fontSize: 14,
    color: '#666',
  },
  chatButton: {
    padding: 8,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
});

export default ProfessionalCard;
