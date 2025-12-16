import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TaskCardProps {
  title: string;
  description: string;
  isCompleted: boolean;
  status: 'Upcoming' | 'Due Soon' | 'Completed';
  onToggle: () => void;
  style?: any;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  title,
  description,
  isCompleted,
  status,
  onToggle,
  style,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Upcoming':
        return '#90EE90';
      case 'Due Soon':
        return '#FF9800';
      case 'Completed':
        return '#4CAF50';
      default:
        return '#90EE90';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.checkbox} onPress={onToggle}>
          {isCompleted && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
        </TouchableOpacity>
        
        <View style={styles.iconContainer}>
          <Ionicons 
            name={isCompleted ? "checkmark-circle" : "calendar"} 
            size={24} 
            color={isCompleted ? "#4CAF50" : "#20B2AA"} 
          />
        </View>
        
        <View style={styles.content}>
          <Text style={[styles.title, isCompleted && styles.completedTitle]}>
            {title}
          </Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
          <Text style={styles.statusText}>{status}</Text>
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
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
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
    marginBottom: 4,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
});
