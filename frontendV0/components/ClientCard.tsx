import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ClientCardProps {
  name: string;
  status: 'Active' | 'Needs Attention' | 'Stable';
  lastActivity: string;
  onViewProfile: () => void;
  onAddNote: () => void;
  onScheduleSession: () => void;
  onMessage?: () => void;
  style?: any;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  name,
  status,
  lastActivity,
  onViewProfile,
  onAddNote,
  onScheduleSession,
  onMessage,
  style,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return '#4CAF50';
      case 'Needs Attention':
        return '#FF9800';
      case 'Stable':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.profileImage}>
            <Ionicons name="person" size={24} color="white" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{name}</Text>
            <View style={styles.statusContainer}>
              {status === 'Stable' && <View style={styles.statusDot} />}
              <Text style={[styles.status, { color: getStatusColor(status) }]}>
                {status}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <Text style={styles.lastActivity}>{lastActivity}</Text>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={onViewProfile}>
          <Text style={styles.primaryButtonText}>View Profile</Text>
        </TouchableOpacity>
        {onMessage && (
          <TouchableOpacity style={styles.messageButton} onPress={onMessage}>
            <Ionicons name="chatbubble" size={16} color="white" />
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={onAddNote}>
          <Text style={styles.secondaryButtonText}>Add Note</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onScheduleSession}>
          <Text style={styles.secondaryButtonText}>Schedule Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#20B2AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9E9E9E',
    marginRight: 6,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  lastActivity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#20B2AA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#20B2AA',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  messageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});
