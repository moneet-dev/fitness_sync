import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GoalCardProps {
  title: string;
  deadline: string;
  assignedBy: string;
  status: 'In Progress' | 'Completed' | 'Pending';
  progress?: number;
  onEdit: () => void;
  style?: any;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  title,
  deadline,
  assignedBy,
  status,
  progress = 0,
  onEdit,
  style,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return '#90EE90';
      case 'Completed':
        return '#4CAF50';
      case 'Pending':
        return '#E0E0E0';
      default:
        return '#E0E0E0';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return '#2E7D32';
      case 'Completed':
        return '#1B5E20';
      case 'Pending':
        return '#666';
      default:
        return '#666';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="target" size={20} color="#20B2AA" />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.details}>
            <Text style={styles.deadline}>Deadline: {deadline}</Text>
            <Text style={styles.assignedBy}>Assigned by: {assignedBy}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Ionicons name="pencil" size={16} color="#666" />
        </TouchableOpacity>
      </View>
      
      {progress > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      )}
      
      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
          <Text style={[styles.statusText, { color: getStatusTextColor(status) }]}>
            {status}
          </Text>
        </View>
      </View>
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
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  details: {
    marginBottom: 8,
  },
  deadline: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  assignedBy: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    padding: 8,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#20B2AA',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#20B2AA',
    minWidth: 40,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
