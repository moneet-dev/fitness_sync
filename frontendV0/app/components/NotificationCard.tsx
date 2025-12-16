import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface NotificationCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  timestamp: string;
  status?: 'Confirmed' | 'New Message' | 'Upcoming' | 'Urgent';
  iconBackground?: string;
  style?: any;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  icon,
  title,
  description,
  timestamp,
  status,
  iconBackground = '#E0F7FA',
  style,
}) => {
  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'New Message':
        return { backgroundColor: '#4CAF50' };
      case 'Urgent':
        return { backgroundColor: '#FF4444' };
      case 'Confirmed':
      case 'Upcoming':
      default:
        return { backgroundColor: '#E0E0E0' };
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: iconBackground }]}>
          <Ionicons name={icon} size={20} color="#20B2AA" />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {status && (
            <View style={[styles.statusBadge, getStatusStyle(status)]}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          )}
        </View>
      </View>
      
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.timestamp}>{timestamp}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
});
